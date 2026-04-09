import type { NextRequest } from "next/server";

import { AppError } from "@/lib/errors";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";
import { readSessionCookie, verifySignedSessionId } from "@/lib/auth";
import type { ActorContext } from "@/types/auth";
import { AccessService } from "@/modules/access/services/AccessService";

import { LocalAuthUserRepository } from "./repositories/LocalAuthUserRepository";
import { SessionRepository } from "./repositories/SessionRepository";

export class CurrentUserResolver {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly accessService: AccessService,
    private readonly localAuthUserRepository: LocalAuthUserRepository,
  ) {}

  async resolveFromRequest(request: Request | NextRequest): Promise<ActorContext | null> {
    const signedSessionId = readSessionCookie(request);

    if (!signedSessionId) {
      return null;
    }

    let sessionId: string;

    try {
      sessionId = await verifySignedSessionId(signedSessionId);
    } catch {
      return null;
    }

    let session;

    try {
      session = await this.sessionRepository.findById(sessionId);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error("Failed to resolve current session", error);
      return null;
    }

    if (!session) {
      return null;
    }

    if (session.expiresAt <= new Date()) {
      await this.sessionRepository.deleteById(session.id);
      return null;
    }

    const localUser = await this.localAuthUserRepository.findById(session.externalUserId);
    const identity =
      localUser ??
      ({
        externalUserId: session.externalUserId,
        username: session.externalUserId,
        employeeCode: session.employeeCode,
        fullName: session.fullName ?? session.externalUserId,
        email: session.email,
        department: session.department,
        passwordHash: "",
        isOrgActive: true,
      } as const);

    if (!identity.isOrgActive) {
      await this.sessionRepository.deleteById(session.id);
      throw new AuthenticationError("เซสชันหมดอายุหรือไม่ถูกต้อง");
    }

    const access = await this.accessService.resolveAccess(session.externalUserId);

    if (!access.isActive) {
      throw new AuthorizationError("สิทธิ์เข้าใช้งานระบบของคุณถูกปิดใช้งาน");
    }

    if (session.effectiveRole !== access.role) {
      await this.sessionRepository.updateEffectiveRole(session.id, access.role);
    }

    return {
      externalUserId: identity.externalUserId,
      role: access.role,
      fullName: identity.fullName,
      email: identity.email,
      employeeCode: identity.employeeCode,
      department: identity.department,
    };
  }
}
