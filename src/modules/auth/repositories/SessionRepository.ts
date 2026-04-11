import { randomUUID } from "node:crypto";

import { and, eq, gt, sql } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/db/postgres";
import { localAuthUsers, sessions, userAccess } from "@/db/schema";
import { measureAsyncOperation } from "@/lib/performance";
import type { ActorContext, Role, SessionRecord } from "@/types/auth";

export type ResolvedSessionActorRecord = SessionRecord & {
  actor: ActorContext;
  isLocallyActive: boolean;
  isAccessActive: boolean;
};

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

  async findResolvedActorById(sessionId: string): Promise<ResolvedSessionActorRecord | null> {
    return measureAsyncOperation(
      "db.sessions.findResolvedActorById",
      async () => {
        const [record] = await this.db
          .select({
            id: sessions.id,
            externalUserId: sessions.externalUserId,
            effectiveRole: sessions.effectiveRole,
            fullName: sessions.fullName,
            email: sessions.email,
            employeeCode: sessions.employeeCode,
            department: sessions.department,
            createdAt: sessions.createdAt,
            expiresAt: sessions.expiresAt,
            resolvedRole: sql<Role>`coalesce(${userAccess.role}::text, 'borrower')`,
            resolvedFullName:
              sql<string | null>`coalesce(${localAuthUsers.fullName}, ${sessions.fullName})`,
            resolvedEmail:
              sql<string | null>`coalesce(${localAuthUsers.email}, ${sessions.email})`,
            resolvedEmployeeCode:
              sql<string | null>`coalesce(${localAuthUsers.employeeCode}, ${sessions.employeeCode})`,
            resolvedDepartment:
              sql<string | null>`coalesce(${localAuthUsers.department}, ${sessions.department})`,
            isLocallyActive: sql<boolean>`coalesce(${localAuthUsers.isActive}, true)`,
            isAccessActive: sql<boolean>`coalesce(${userAccess.isActive}, true)`,
          })
          .from(sessions)
          .leftJoin(
            localAuthUsers,
            eq(sessions.externalUserId, localAuthUsers.externalUserId),
          )
          .leftJoin(userAccess, eq(sessions.externalUserId, userAccess.externalUserId))
          .where(eq(sessions.id, sessionId))
          .limit(1);

        if (!record) {
          return null;
        }

        return {
          id: record.id,
          externalUserId: record.externalUserId,
          effectiveRole: record.effectiveRole,
          fullName: record.fullName,
          email: record.email,
          employeeCode: record.employeeCode,
          department: record.department,
          createdAt: record.createdAt,
          expiresAt: record.expiresAt,
          isLocallyActive: record.isLocallyActive,
          isAccessActive: record.isAccessActive,
          actor: {
            externalUserId: record.externalUserId,
            role: record.resolvedRole,
            fullName: record.resolvedFullName ?? undefined,
            email: record.resolvedEmail,
            employeeCode: record.resolvedEmployeeCode,
            department: record.resolvedDepartment,
          },
        };
      },
      {
        context: {
          sessionId,
        },
      },
    );
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
