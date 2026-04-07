import type { NextRequest } from "next/server";

import { AuthenticationError, AuthorizationError } from "@/lib/errors";
import { readSessionCookie, verifySignedSessionId } from "@/lib/auth";
import type { ActorContext } from "@/types/auth";
import { AccessService } from "@/modules/access/services/AccessService";

import { LocalAuthUserRepository } from "./repositories/LocalAuthUserRepository";
import { LegacyUserRepository } from "./repositories/LegacyUserRepository";
import { SessionRepository } from "./repositories/SessionRepository";

export class CurrentUserResolver {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly accessService: AccessService,
    private readonly localAuthUserRepository: LocalAuthUserRepository,
    private readonly legacyUserRepository: LegacyUserRepository,
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

    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      return null;
    }

    if (session.expiresAt <= new Date()) {
      await this.sessionRepository.deleteById(session.id);
      return null;
    }

    const localUser = await this.localAuthUserRepository.findById(session.externalUserId);
    const legacyUser = localUser ? null : await this.legacyUserRepository.findById(session.externalUserId);
    const identity = localUser ?? legacyUser;

    if (!identity || !identity.isOrgActive) {
      await this.sessionRepository.deleteById(session.id);
      throw new AuthenticationError("Session is no longer valid");
    }

    const access = await this.accessService.resolveAccess(session.externalUserId);

    if (!access.isActive) {
      throw new AuthorizationError("Your access to this application has been disabled");
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
