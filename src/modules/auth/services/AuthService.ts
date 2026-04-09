import bcrypt from "bcryptjs";

import { getServerAuthProviderMode } from "@/lib/auth-provider";
import { readSessionCookie, verifySignedSessionId } from "@/lib/auth";
import { AuthenticationError, AuthorizationError, ValidationError } from "@/lib/errors";
import type { ActorContext } from "@/types/auth";
import { AccessService } from "@/modules/access/services/AccessService";

import { CurrentUserResolver } from "../CurrentUserResolver";
import { LocalAuthUserRepository } from "../repositories/LocalAuthUserRepository";
import { SessionRepository } from "../repositories/SessionRepository";

type LoginInput = {
  username?: string;
  password?: string;
};

type ExternalIdentityInput = {
  externalUserId: string;
  fullName?: string;
  email?: string | null;
  employeeCode?: string | null;
  department?: string | null;
};

export class AuthService {
  constructor(
    private readonly localAuthUserRepository: LocalAuthUserRepository,
    private readonly accessService: AccessService,
    private readonly sessionRepository: SessionRepository,
    private readonly currentUserResolver: CurrentUserResolver,
  ) {}

  private getSessionExpiry() {
    const ttlHours = Number(process.env.SESSION_TTL_HOURS ?? "8");
    return new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  }

  private async createSessionForIdentity(
    identity: ExternalIdentityInput,
  ): Promise<{ sessionId: string; user: ActorContext }> {
    const access = await this.accessService.resolveAccess(identity.externalUserId);

    if (!access.isActive) {
      throw new AuthorizationError("สิทธิ์เข้าใช้งานระบบของคุณถูกปิดใช้งาน");
    }

    const session = await this.sessionRepository.create({
      externalUserId: identity.externalUserId,
      effectiveRole: access.role,
      fullName: identity.fullName ?? null,
      email: identity.email ?? null,
      employeeCode: identity.employeeCode ?? null,
      department: identity.department ?? null,
      expiresAt: this.getSessionExpiry(),
    });

    return {
      sessionId: session.id,
      user: {
        externalUserId: identity.externalUserId,
        role: access.role,
        fullName: identity.fullName,
        email: identity.email,
        employeeCode: identity.employeeCode,
        department: identity.department,
      },
    };
  }

  async login(input: LoginInput): Promise<{ sessionId: string; user: ActorContext }> {
    if (getServerAuthProviderMode() === "oidc") {
      throw new ValidationError("ปิดการเข้าสู่ระบบด้วยรหัสผ่านเมื่อใช้ AUTH_PROVIDER=oidc");
    }

    const username = input.username?.trim();
    const password = input.password;

    if (!username || !password) {
      throw new ValidationError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน", {
        fields: {
          username: !username ? "required" : undefined,
          password: !password ? "required" : undefined,
        },
      });
    }

    const identity = await this.localAuthUserRepository.findByUsername(username);

    if (!identity || !identity.isOrgActive) {
      throw new AuthenticationError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    }

    const passwordMatches = await bcrypt.compare(password, identity.passwordHash);

    if (!passwordMatches) {
      throw new AuthenticationError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    }

    return this.createSessionForIdentity({
      externalUserId: identity.externalUserId,
      fullName: identity.fullName,
      email: identity.email,
      employeeCode: identity.employeeCode,
      department: identity.department,
    });
  }

  async loginWithExternalIdentity(
    identity: ExternalIdentityInput,
  ): Promise<{ sessionId: string; user: ActorContext }> {
    if (!identity.externalUserId.trim()) {
      throw new ValidationError("ข้อมูลจาก OIDC ไม่มี externalUserId");
    }

    return this.createSessionForIdentity({
      externalUserId: identity.externalUserId.trim(),
      fullName: identity.fullName?.trim() || identity.externalUserId.trim(),
      email: identity.email ?? null,
      employeeCode: identity.employeeCode ?? null,
      department: identity.department ?? null,
    });
  }

  async getCurrentUser(request: Request) {
    const actor = await this.currentUserResolver.resolveFromRequest(request);

    if (!actor) {
      throw new AuthenticationError("กรุณาเข้าสู่ระบบ");
    }

    return actor;
  }

  async logout(request: Request) {
    const signedSessionId = readSessionCookie(request);

    if (!signedSessionId) {
      return;
    }

    try {
      const sessionId = await verifySignedSessionId(signedSessionId);
      await this.sessionRepository.deleteById(sessionId);
    } catch {
      return;
    }
  }

  async resolveCurrentUserOrNull(request: Request) {
    return this.currentUserResolver.resolveFromRequest(request);
  }
}
