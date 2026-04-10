import { and, count, desc, eq, gte, lte, or, sql, type SQLWrapper } from "drizzle-orm";

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

  async findMany(
    filters: AuditLogListQuery,
    actorExternalUserId?: string,
  ): Promise<AuditLogRecord[]> {
    const rows = await this.selectRecords(
      this.buildConditions(filters, actorExternalUserId),
      undefined,
      undefined,
      true,
    );

    return rows.map((row) => ({
      ...row,
      actorName: row.actorName ?? null,
    }));
  }

  async findPage(
    filters: AuditLogListQuery,
    defaultLimit = 20,
    actorExternalUserId?: string,
    includeData = false,
  ): Promise<PaginatedResult<AuditLogRecord>> {
    const conditions = this.buildConditions(filters, actorExternalUserId);
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
      includeData,
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

  private buildConditions(
    filters: AuditLogListQuery,
    actorExternalUserId?: string,
  ) {
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

    if (actorExternalUserId) {
      const borrowRequestBorrowerId =
        sql<string | null>`coalesce(${auditLogs.afterData}->>'borrowerExternalUserId', ${auditLogs.beforeData}->>'borrowerExternalUserId')`;
      const returnBorrowerId =
        sql<string | null>`coalesce(${auditLogs.afterData}->'borrowRequest'->>'borrowerExternalUserId', ${auditLogs.beforeData}->'borrowRequest'->>'borrowerExternalUserId')`;
      // Match logs where the user was the actor, the subject of a borrow request,
      // or the subject of a return transaction — equivalent to logBelongsToBorrower().
      conditions.push(
        or(
          eq(auditLogs.actorExternalUserId, actorExternalUserId),
          and(
            eq(auditLogs.entityType, "borrow_request"),
            sql`${borrowRequestBorrowerId} = ${actorExternalUserId}`,
          ),
          and(
            eq(auditLogs.entityType, "return_transaction"),
            sql`${returnBorrowerId} = ${actorExternalUserId}`,
          ),
        )!,
      );
    }

    return conditions;
  }

  private async selectRecords(
    conditions: SQLWrapper[],
    limit?: number,
    offset?: number,
    includeData = true,
  ) {
    const query = this.db
      .select({
        id: auditLogs.id,
        actorExternalUserId: auditLogs.actorExternalUserId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        // Skip JSONB columns when not needed — they can be 10–100KB per row.
        beforeData: includeData ? auditLogs.beforeData : sql<null>`null`,
        afterData: includeData ? auditLogs.afterData : sql<null>`null`,
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
