import { and, asc, count, desc, eq, inArray, lt, sql } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/db/postgres";
import {
  assets,
  borrowRequestItems,
  borrowRequests,
  localAuthUsers,
} from "@/db/schema";
import type {
  BorrowRequestCreateInput,
  BorrowRequestListQuery,
} from "@/lib/validators/borrow-requests";
import {
  buildPaginatedResult,
  resolvePagination,
  type PaginatedResult,
} from "@/lib/pagination";
import { measureAsyncOperation } from "@/lib/performance";
import type { BorrowRequestStatus } from "@/modules/borrow/domain/BorrowRequestStateMachine";
import { BORROW_REQUEST_STATUS_VALUES } from "@/types/borrow-requests";

export type BorrowRequestItemView = {
  id: number;
  assetId: number;
  assetCode: string;
  assetName: string;
  availableQty: number;
  requestedQty: number;
  approvedQty: number | null;
};

export type BorrowRequestDetail = typeof borrowRequests.$inferSelect & {
  borrowerName: string;
  items: BorrowRequestItemView[];
};

export type BorrowRequestListSummary = {
  id: number;
  requestNo: string;
  borrowerName: string;
  dueDate: string;
  status: BorrowRequestStatus;
};

type BorrowRequestListFilters = BorrowRequestListQuery & {
  borrowerExternalUserId?: string;
};

export class BorrowRequestRepository {
  constructor(private readonly db: DbExecutor = getDb()) {}

  private readonly listOrder = [
    sql`case ${borrowRequests.status}::text
      when 'pending' then 0
      when 'approved' then 1
      when 'partially_approved' then 2
      when 'partially_returned' then 3
      when 'returned' then 4
      when 'rejected' then 5
      when 'cancelled' then 6
      else 7
    end`,
    desc(borrowRequests.createdAt),
    desc(borrowRequests.id),
  ] as const;

  async findMany(filters: BorrowRequestListFilters): Promise<BorrowRequestDetail[]> {
    const conditions = this.buildConditions(filters);

    const query = this.db
      .select()
      .from(borrowRequests)
      .orderBy(...this.listOrder);

    const requests =
      conditions.length > 0 ? await query.where(and(...conditions)) : await query;

    return this.attachRelations(requests);
  }

  async findSummaries(
    filters: BorrowRequestListFilters & { statuses?: BorrowRequestStatus[] },
    limit?: number,
  ): Promise<BorrowRequestListSummary[]> {
    return measureAsyncOperation(
      "db.borrowRequests.findSummaries",
      async () => {
        const conditions = this.buildConditions(filters);

        if (filters.statuses && filters.statuses.length > 0) {
          conditions.push(inArray(borrowRequests.status, filters.statuses));
        }

        const baseQuery = this.db
          .select({
            id: borrowRequests.id,
            requestNo: borrowRequests.requestNo,
            borrowerExternalUserId: borrowRequests.borrowerExternalUserId,
            borrowerName: localAuthUsers.fullName,
            dueDate: borrowRequests.dueDate,
            status: borrowRequests.status,
          })
          .from(borrowRequests)
          .leftJoin(
            localAuthUsers,
            eq(borrowRequests.borrowerExternalUserId, localAuthUsers.externalUserId),
          );

        const query =
          typeof limit === "number"
            ? baseQuery.orderBy(...this.listOrder).limit(limit)
            : baseQuery.orderBy(...this.listOrder);

        const rows =
          conditions.length > 0 ? await query.where(and(...conditions)) : await query;

        return rows.map((row) => ({
          id: row.id,
          requestNo: row.requestNo,
          borrowerName: row.borrowerName ?? row.borrowerExternalUserId,
          dueDate: row.dueDate,
          status: row.status,
        }));
      },
      {
        context: {
          limit,
          status: filters.status,
          borrowerExternalUserId: filters.borrowerExternalUserId,
          statuses: filters.statuses,
        },
      },
    );
  }

  async getStatusCounts(
    filters: BorrowRequestListFilters,
  ): Promise<Record<BorrowRequestStatus, number>> {
    return measureAsyncOperation(
      "db.borrowRequests.getStatusCounts",
      async () => {
        const conditions = this.buildConditions(filters);
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        const rows = await this.db
          .select({
            status: borrowRequests.status,
            total: count(),
          })
          .from(borrowRequests)
          .where(whereClause)
          .groupBy(borrowRequests.status);

        const counts = Object.fromEntries(
          BORROW_REQUEST_STATUS_VALUES.map((status) => [status, 0]),
        ) as Record<BorrowRequestStatus, number>;

        for (const row of rows) {
          counts[row.status] = Number(row.total);
        }

        return counts;
      },
      {
        context: {
          status: filters.status,
          borrowerExternalUserId: filters.borrowerExternalUserId,
        },
      },
    );
  }

  async findPage(
    filters: BorrowRequestListFilters,
    defaultLimit = 10,
  ): Promise<PaginatedResult<BorrowRequestDetail>> {
    return measureAsyncOperation(
      "db.borrowRequests.findPage",
      async () => {
        const conditions = this.buildConditions(filters);
        const pagination = resolvePagination(filters, defaultLimit);
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [countRow] = await this.db
          .select({ total: count() })
          .from(borrowRequests)
          .where(whereClause);

        const query = this.db
          .select()
          .from(borrowRequests)
          .orderBy(...this.listOrder)
          .limit(pagination.limit)
          .offset(pagination.offset);
        const requests = whereClause ? await query.where(whereClause) : await query;
        const items = await this.attachRelations(requests);

        return buildPaginatedResult(items, countRow?.total ?? 0, pagination);
      },
      {
        context: {
          page: filters.page,
          limit: filters.limit,
          status: filters.status,
          borrowerExternalUserId: filters.borrowerExternalUserId,
        },
      },
    );
  }

  async findById(id: number): Promise<BorrowRequestDetail | null> {
    const [request] = await this.db
      .select()
      .from(borrowRequests)
      .where(eq(borrowRequests.id, id))
      .limit(1);

    if (!request) {
      return null;
    }

    const [result] = await this.attachRelations([request]);
    return result ?? null;
  }

  async findByIdForUpdate(id: number): Promise<BorrowRequestDetail | null> {
    const [request] = await this.db
      .select()
      .from(borrowRequests)
      .where(eq(borrowRequests.id, id))
      .limit(1)
      .for("update");

    if (!request) {
      return null;
    }

    const [result] = await this.attachRelations([request]);
    return result ?? null;
  }

  async findManyByIds(ids: number[]): Promise<BorrowRequestDetail[]> {
    const uniqueIds = Array.from(new Set(ids));

    if (uniqueIds.length === 0) {
      return [];
    }

    const requests = await this.db
      .select()
      .from(borrowRequests)
      .where(inArray(borrowRequests.id, uniqueIds))
      .orderBy(desc(borrowRequests.createdAt), asc(borrowRequests.id));

    return this.attachRelations(requests);
  }

  async findManyByDueDate(
    dueDate: string,
    statuses: BorrowRequestStatus[],
  ): Promise<BorrowRequestDetail[]> {
    const rows = await this.db
      .select()
      .from(borrowRequests)
      .where(
        and(
          eq(borrowRequests.dueDate, dueDate),
          inArray(borrowRequests.status, statuses),
        ),
      )
      .orderBy(desc(borrowRequests.createdAt), asc(borrowRequests.id));

    return this.attachRelations(rows);
  }

  async findManyOverdue(
    beforeDate: string,
    statuses: BorrowRequestStatus[],
  ): Promise<BorrowRequestDetail[]> {
    const rows = await this.db
      .select()
      .from(borrowRequests)
      .where(
        and(
          lt(borrowRequests.dueDate, beforeDate),
          inArray(borrowRequests.status, statuses),
        ),
      )
      .orderBy(desc(borrowRequests.createdAt), asc(borrowRequests.id));

    return this.attachRelations(rows);
  }

  async create(
    input: Pick<BorrowRequestCreateInput, "purpose" | "startDate" | "dueDate"> & {
      borrowerExternalUserId: string;
      requestNo: string;
    },
  ) {
    const [record] = await this.db
      .insert(borrowRequests)
      .values({
        requestNo: input.requestNo,
        borrowerExternalUserId: input.borrowerExternalUserId,
        purpose: input.purpose,
        startDate: input.startDate,
        dueDate: input.dueDate,
      })
      .returning();

    return record;
  }

  async updateRequestNo(id: number, requestNo: string) {
    const [record] = await this.db
      .update(borrowRequests)
      .set({
        requestNo,
        updatedAt: new Date(),
      })
      .where(eq(borrowRequests.id, id))
      .returning();

    return record ?? null;
  }

  async insertItems(
    borrowRequestId: number,
    items: BorrowRequestCreateInput["items"],
  ) {
    return this.db
      .insert(borrowRequestItems)
      .values(
        items.map((item) => ({
          borrowRequestId,
          assetId: item.assetId,
          requestedQty: item.requestedQty,
        })),
      )
      .returning();
  }

  async updateItemApprovals(
    items: Array<{ borrowRequestItemId: number; approvedQty: number }>,
  ) {
    if (items.length === 0) {
      return [];
    }

    const updatedAt = new Date();
    const itemIds = items.map((item) => item.borrowRequestItemId);
    const approvedQtySql = sql<number>`cast(case ${borrowRequestItems.id}
      ${sql.join(
        items.map(
          (item) => sql`when ${item.borrowRequestItemId} then ${item.approvedQty}`,
        ),
        sql` `,
      )}
      end as integer)`;

    return this.db
      .update(borrowRequestItems)
      .set({
        approvedQty: approvedQtySql,
        updatedAt,
      })
      .where(inArray(borrowRequestItems.id, itemIds))
      .returning();
  }

  async markApproved(id: number, approvedByExternalUserId: string) {
    const [record] = await this.db
      .update(borrowRequests)
      .set({
        status: "approved",
        approvedByExternalUserId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(borrowRequests.id, id), eq(borrowRequests.status, "pending")))
      .returning();

    return record ?? null;
  }

  async markReviewed(
    id: number,
    approvedByExternalUserId: string,
    status: "approved" | "partially_approved",
  ) {
    const [record] = await this.db
      .update(borrowRequests)
      .set({
        status,
        approvedByExternalUserId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(borrowRequests.id, id), eq(borrowRequests.status, "pending")))
      .returning();

    return record ?? null;
  }

  async markRejected(
    id: number,
    rejectedByExternalUserId: string,
    rejectionReason?: string,
    expectedCurrentStatus: BorrowRequestStatus = "pending",
  ) {
    const [record] = await this.db
      .update(borrowRequests)
      .set({
        status: "rejected",
        rejectedByExternalUserId,
        rejectedAt: new Date(),
        rejectionReason: rejectionReason ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(borrowRequests.id, id),
          eq(borrowRequests.status, expectedCurrentStatus),
        ),
      )
      .returning();

    return record ?? null;
  }

  async markCancelled(
    id: number,
    cancelledByExternalUserId: string,
    cancelReason?: string,
    expectedCurrentStatus?: BorrowRequestStatus,
  ) {
    const conditions = [eq(borrowRequests.id, id)];

    if (expectedCurrentStatus) {
      conditions.push(eq(borrowRequests.status, expectedCurrentStatus));
    }

    const [record] = await this.db
      .update(borrowRequests)
      .set({
        status: "cancelled",
        cancelledByExternalUserId,
        cancelledAt: new Date(),
        cancelReason: cancelReason ?? null,
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();

    return record ?? null;
  }

  async updateStatus(
    id: number,
    status:
      | "approved"
      | "partially_approved"
      | "rejected"
      | "cancelled"
      | "partially_returned"
      | "returned",
  ) {
    const [record] = await this.db
      .update(borrowRequests)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(borrowRequests.id, id))
      .returning();

    return record ?? null;
  }

  private buildConditions(filters: BorrowRequestListFilters) {
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(borrowRequests.status, filters.status));
    }

    if (filters.borrowerExternalUserId) {
      conditions.push(eq(borrowRequests.borrowerExternalUserId, filters.borrowerExternalUserId));
    }

    return conditions;
  }

  private async attachRelations(
    requests: Array<typeof borrowRequests.$inferSelect>,
  ): Promise<BorrowRequestDetail[]> {
    if (requests.length === 0) {
      return [];
    }

    const requestIds = requests.map((request) => request.id);
    const borrowerIds = Array.from(
      new Set(requests.map((request) => request.borrowerExternalUserId)),
    );

    const [items, borrowers] = await Promise.all([
      this.db
        .select({
          id: borrowRequestItems.id,
          borrowRequestId: borrowRequestItems.borrowRequestId,
          assetId: borrowRequestItems.assetId,
          assetCode: assets.assetCode,
          assetName: assets.name,
          availableQty: assets.availableQty,
          requestedQty: borrowRequestItems.requestedQty,
          approvedQty: borrowRequestItems.approvedQty,
        })
        .from(borrowRequestItems)
        .innerJoin(assets, eq(borrowRequestItems.assetId, assets.id))
        .where(inArray(borrowRequestItems.borrowRequestId, requestIds)),
      this.db
        .select({
          externalUserId: localAuthUsers.externalUserId,
          fullName: localAuthUsers.fullName,
        })
        .from(localAuthUsers)
        .where(inArray(localAuthUsers.externalUserId, borrowerIds)),
    ]);

    const itemsByRequestId = new Map<number, BorrowRequestItemView[]>();

    for (const item of items) {
      const list = itemsByRequestId.get(item.borrowRequestId) ?? [];
      list.push({
        id: item.id,
        assetId: item.assetId,
        assetCode: item.assetCode,
        assetName: item.assetName,
        availableQty: item.availableQty,
        requestedQty: item.requestedQty,
        approvedQty: item.approvedQty,
      });
      itemsByRequestId.set(item.borrowRequestId, list);
    }

    const borrowerNames = new Map(
      borrowers.map((borrower) => [borrower.externalUserId, borrower.fullName]),
    );

    return requests.map((request) => ({
      ...request,
      borrowerName:
        borrowerNames.get(request.borrowerExternalUserId) ?? request.borrowerExternalUserId,
      items: itemsByRequestId.get(request.id) ?? [],
    }));
  }
}
