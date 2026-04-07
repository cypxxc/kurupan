import bcrypt from "bcryptjs";

import { readSessionCookie, verifySignedSessionId } from "@/lib/auth";
import { AuthenticationError, AuthorizationError, ValidationError } from "@/lib/errors";
import type { ActorContext } from "@/types/auth";
import { AccessService } from "@/modules/access/services/AccessService";

import { CurrentUserResolver } from "../CurrentUserResolver";
import { LegacyUserRepository } from "../repositories/LegacyUserRepository";
import { LocalAuthUserRepository } from "../repositories/LocalAuthUserRepository";
import { SessionRepository } from "../repositories/SessionRepository";

type LoginInput = {
  username?: string;
  password?: string;
};

export class AuthService {
  constructor(
    private readonly localAuthUserRepository: LocalAuthUserRepository,
    private readonly legacyUserRepository: LegacyUserRepository,
    private readonly accessService: AccessService,
    private readonly sessionRepository: SessionRepository,
    private readonly currentUserResolver: CurrentUserResolver,
  ) {}

  private getSessionExpiry() {
    const ttlHours = Number(process.env.SESSION_TTL_HOURS ?? "8");
    return new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  }

  async login(input: LoginInput): Promise<{ sessionId: string; user: ActorContext }> {
    const username = input.username?.trim();
    const password = input.password;

    if (!username || !password) {
      throw new ValidationError("Username and password are required", {
        fields: {
          username: !username ? "required" : undefined,
          password: !password ? "required" : undefined,
        },
      });
    }

    const localUser = await this.localAuthUserRepository.findByUsername(username);
    const legacyUser = localUser ? null : await this.legacyUserRepository.findByUsername(username);
    const identity = localUser ?? legacyUser;

    if (!identity || !identity.isOrgActive) {
      throw new AuthenticationError("Invalid username or password");
    }

    const passwordMatches = await bcrypt.compare(password, identity.passwordHash);

    if (!passwordMatches) {
      throw new AuthenticationError("Invalid username or password");
    }

    const access = await this.accessService.resolveAccess(identity.externalUserId);

    if (!access.isActive) {
      throw new AuthorizationError("Your access to this application has been disabled");
    }

    const session = await this.sessionRepository.create({
      externalUserId: identity.externalUserId,
      effectiveRole: access.role,
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

  async getCurrentUser(request: Request) {
    const actor = await this.currentUserResolver.resolveFromRequest(request);

    if (!actor) {
      throw new AuthenticationError("Authentication required");
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
