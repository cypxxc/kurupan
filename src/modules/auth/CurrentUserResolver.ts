import type { NextRequest } from "next/server";

import { AppError } from "@/lib/errors";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";
import { readSessionCookie, verifySignedSessionId } from "@/lib/auth";
import type { ActorContext } from "@/types/auth";

import { SessionRepository } from "./repositories/SessionRepository";

export class CurrentUserResolver {
  constructor(private readonly sessionRepository: SessionRepository) {}

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

    let resolvedSession;

    try {
      resolvedSession = await this.sessionRepository.findResolvedActorById(sessionId);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error("Failed to resolve current session", error);
      return null;
    }

    if (!resolvedSession) {
      return null;
    }

    if (resolvedSession.expiresAt <= new Date()) {
      await this.sessionRepository.deleteById(resolvedSession.id);
      return null;
    }

    if (!resolvedSession.isLocallyActive) {
      await this.sessionRepository.deleteById(resolvedSession.id);
      throw new AuthenticationError("เซสชันหมดอายุหรือไม่ถูกต้อง");
    }

    if (!resolvedSession.isAccessActive) {
      throw new AuthorizationError("สิทธิ์เข้าใช้งานระบบของคุณถูกปิดใช้งาน");
    }

    if (resolvedSession.effectiveRole !== resolvedSession.actor.role) {
      await this.sessionRepository.updateEffectiveRole(
        resolvedSession.id,
        resolvedSession.actor.role,
      );
    }

    return resolvedSession.actor;
  }
}
