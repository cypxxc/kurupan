import { and, asc, desc, eq, inArray } from "drizzle-orm";

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

export type BorrowRequestItemView = {
  id: number;
  assetId: number;
  assetCode: string;
  assetName: string;
  requestedQty: number;
  approvedQty: number | null;
};

export type BorrowRequestDetail = typeof borrowRequests.$inferSelect & {
  borrowerName: string;
  items: BorrowRequestItemView[];
};

type BorrowRequestListFilters = BorrowRequestListQuery & {
  borrowerExternalUserId?: string;
};

export class BorrowRequestRepository {
  constructor(private readonly db: DbExecutor = getDb()) {}

  async findMany(filters: BorrowRequestListFilters): Promise<BorrowRequestDetail[]> {
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(borrowRequests.status, filters.status));
    }

    if (filters.borrowerExternalUserId) {
      conditions.push(eq(borrowRequests.borrowerExternalUserId, filters.borrowerExternalUserId));
    }

    const query = this.db
      .select()
      .from(borrowRequests)
      .orderBy(desc(borrowRequests.createdAt), asc(borrowRequests.id));

    const requests =
      conditions.length > 0 ? await query.where(and(...conditions)) : await query;

    return this.attachRelations(requests);
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
    const updatedItems = [];

    for (const item of items) {
      const [updated] = await this.db
        .update(borrowRequestItems)
        .set({
          approvedQty: item.approvedQty,
          updatedAt: new Date(),
        })
        .where(eq(borrowRequestItems.id, item.borrowRequestItemId))
        .returning();

      if (updated) {
        updatedItems.push(updated);
      }
    }

    return updatedItems;
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
      .where(eq(borrowRequests.id, id))
      .returning();

    return record ?? null;
  }

  async markRejected(
    id: number,
    rejectedByExternalUserId: string,
    rejectionReason?: string,
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
      .where(eq(borrowRequests.id, id))
      .returning();

    return record ?? null;
  }

  async markCancelled(
    id: number,
    cancelledByExternalUserId: string,
    cancelReason?: string,
  ) {
    const [record] = await this.db
      .update(borrowRequests)
      .set({
        status: "cancelled",
        cancelledByExternalUserId,
        cancelledAt: new Date(),
        cancelReason: cancelReason ?? null,
        updatedAt: new Date(),
      })
      .where(eq(borrowRequests.id, id))
      .returning();

    return record ?? null;
  }

  async updateStatus(
    id: number,
    status: "approved" | "rejected" | "cancelled" | "partially_returned" | "returned",
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
