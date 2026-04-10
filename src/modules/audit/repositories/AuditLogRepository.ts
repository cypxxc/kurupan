import { and, count, desc, eq, gte, lte, type SQLWrapper } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/db/postgres";
import { auditLogs, localAuthUsers } from "@/db/schema";
import {
  buildPaginatedResult,
  resolvePagination,
  type PaginatedResult,
} from "@/lib/pagination";
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
    const rows = await this.selectRecords(this.buildConditions(filters));

    return rows.map((row) => ({
      ...row,
      actorName: row.actorName ?? null,
    }));
  }

  async findPage(
    filters: AuditLogListQuery,
    defaultLimit = 20,
  ): Promise<PaginatedResult<AuditLogRecord>> {
    const conditions = this.buildConditions(filters);
    const pagination = resolvePagination(filters, defaultLimit);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await this.db
      .select({ total: count() })
      .from(auditLogs)
      .where(whereClause);
    const rows = await this.selectRecords(
      conditions,
      pagination.limit,
      pagination.offset,
    );

    return buildPaginatedResult(
      rows.map((row) => ({
        ...row,
        actorName: row.actorName ?? null,
      })),
      countRow?.total ?? 0,
      pagination,
    );
  }

  private buildConditions(filters: AuditLogListQuery) {
    const conditions: SQLWrapper[] = [];

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

    return conditions;
  }

  private async selectRecords(conditions: SQLWrapper[], limit?: number, offset?: number) {
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
    const pagedQuery =
      limit === undefined || offset === undefined ? query : query.limit(limit).offset(offset);

    return conditions.length > 0 ? pagedQuery.where(and(...conditions)) : pagedQuery;
  }
}
