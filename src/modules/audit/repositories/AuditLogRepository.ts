import { and, desc, eq, gte, lte } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/db/postgres";
import { auditLogs, localAuthUsers } from "@/db/schema";
import type { AuditLogListQuery } from "@/lib/validators/history";

export type CreateAuditLogInput = {
  actorExternalUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: unknown;
  afterData?: unknown;
};

export type AuditLogRecord = typeof auditLogs.$inferSelect & {
  actorName: string | null;
};

function toDateRangeStart(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toDateRangeEnd(value: string) {
  return new Date(`${value}T23:59:59.999`);
}

export class AuditLogRepository {
  constructor(private readonly db: DbExecutor = getDb()) {}

  async create(input: CreateAuditLogInput) {
    const [record] = await this.db
      .insert(auditLogs)
      .values({
        actorExternalUserId: input.actorExternalUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        beforeData: input.beforeData,
        afterData: input.afterData,
      })
      .returning();

    return record;
  }

  async findMany(filters: AuditLogListQuery): Promise<AuditLogRecord[]> {
    const conditions = [];

    if (filters.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }

    if (filters.entityId) {
      conditions.push(eq(auditLogs.entityId, filters.entityId));
    }

    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }

    if (filters.dateFrom) {
      conditions.push(gte(auditLogs.createdAt, toDateRangeStart(filters.dateFrom)));
    }

    if (filters.dateTo) {
      conditions.push(lte(auditLogs.createdAt, toDateRangeEnd(filters.dateTo)));
    }

    const query = this.db
      .select({
        id: auditLogs.id,
        actorExternalUserId: auditLogs.actorExternalUserId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        beforeData: auditLogs.beforeData,
        afterData: auditLogs.afterData,
        createdAt: auditLogs.createdAt,
        actorName: localAuthUsers.fullName,
      })
      .from(auditLogs)
      .leftJoin(
        localAuthUsers,
        eq(auditLogs.actorExternalUserId, localAuthUsers.externalUserId),
      )
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id));

    const rows = conditions.length > 0 ? await query.where(and(...conditions)) : await query;

    return rows.map((row) => ({
      ...row,
      actorName: row.actorName ?? null,
    }));
  }
}
