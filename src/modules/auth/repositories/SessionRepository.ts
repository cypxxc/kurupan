import { randomUUID } from "node:crypto";

import { and, eq, gt } from "drizzle-orm";

import { getDb } from "@/db/postgres";
import { sessions } from "@/db/schema";
import type { Role, SessionRecord } from "@/types/auth";

export class SessionRepository {
  async create(params: {
    externalUserId: string;
    effectiveRole: Role;
    expiresAt: Date;
  }): Promise<SessionRecord> {
    const [session] = await getDb()
      .insert(sessions)
      .values({
        id: randomUUID(),
        externalUserId: params.externalUserId,
        effectiveRole: params.effectiveRole,
        expiresAt: params.expiresAt,
      })
      .returning();

    return session;
  }

  async findValidById(sessionId: string) {
    const [session] = await getDb()
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
      .limit(1);

    return session ?? null;
  }

  async findById(sessionId: string) {
    const [session] = await getDb()
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    return session ?? null;
  }

  async updateEffectiveRole(sessionId: string, role: Role) {
    await getDb()
      .update(sessions)
      .set({ effectiveRole: role })
      .where(eq(sessions.id, sessionId));
  }

  async deleteById(sessionId: string) {
    await getDb().delete(sessions).where(eq(sessions.id, sessionId));
  }
}
