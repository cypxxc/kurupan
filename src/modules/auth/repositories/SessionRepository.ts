import { randomUUID } from "node:crypto";

import { and, eq, gt } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/db/postgres";
import { sessions } from "@/db/schema";
import type { Role, SessionRecord } from "@/types/auth";

export class SessionRepository {
  constructor(private readonly db: DbExecutor = getDb()) {}

  async create(params: {
    externalUserId: string;
    effectiveRole: Role;
    fullName?: string | null;
    email?: string | null;
    employeeCode?: string | null;
    department?: string | null;
    expiresAt: Date;
  }): Promise<SessionRecord> {
    const [session] = await this.db
      .insert(sessions)
      .values({
        id: randomUUID(),
        externalUserId: params.externalUserId,
        effectiveRole: params.effectiveRole,
        fullName: params.fullName ?? null,
        email: params.email ?? null,
        employeeCode: params.employeeCode ?? null,
        department: params.department ?? null,
        expiresAt: params.expiresAt,
      })
      .returning();

    return session;
  }

  async findValidById(sessionId: string) {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
      .limit(1);

    return session ?? null;
  }

  async findById(sessionId: string) {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    return session ?? null;
  }

  async updateEffectiveRole(sessionId: string, role: Role) {
    await this.db
      .update(sessions)
      .set({ effectiveRole: role })
      .where(eq(sessions.id, sessionId));
  }

  async deleteById(sessionId: string) {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
  }
}
