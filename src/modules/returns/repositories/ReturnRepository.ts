import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/db/postgres";
import {
  assets,
  borrowRequestItems,
  borrowRequests,
  localAuthUsers,
  returnTransactionItems,
  returnTransactions,
} from "@/db/schema";
import type {
  ReturnCreateInput,
  ReturnListQuery,
  ReturnUpdateInput,
} from "@/lib/validators/returns";

export type ReturnTransactionItemView = {
  id: number;
  borrowRequestItemId: number;
  assetId: number;
  assetCode: string;
  assetName: string;
  returnQty: number;
  condition: "good" | "damaged" | "lost";
  note: string | null;
};

export type ReturnTransactionDetail = typeof returnTransactions.$inferSelect & {
  borrowRequestNo: string;
  borrowerExternalUserId: string;
  borrowerName: string;
  items: ReturnTransactionItemView[];
};

export class ReturnRepository {
  constructor(private readonly db: DbExecutor = getDb()) {}

  async findMany(
    filters: ReturnListQuery & { borrowerExternalUserId?: string },
  ): Promise<ReturnTransactionDetail[]> {
    const conditions = [];

    if (filters.borrowRequestId) {
      conditions.push(eq(returnTransactions.borrowRequestId, filters.borrowRequestId));
    }

    if (filters.borrowerExternalUserId) {
      conditions.push(
        eq(borrowRequests.borrowerExternalUserId, filters.borrowerExternalUserId),
      );
    }

    const query = this.db
      .select({
        record: returnTransactions,
      })
      .from(returnTransactions)
      .innerJoin(borrowRequests, eq(returnTransactions.borrowRequestId, borrowRequests.id))
      .orderBy(desc(returnTransactions.returnedAt), desc(returnTransactions.id));

    const rows =
      conditions.length > 0 ? await query.where(and(...conditions)) : await query;

    return this.attachRelations(rows.map((row) => row.record));
  }

  async findById(id: number): Promise<ReturnTransactionDetail | null> {
    const [row] = await this.db
      .select()
      .from(returnTransactions)
      .where(eq(returnTransactions.id, id))
      .limit(1);

    if (!row) {
      return null;
    }

    const [detail] = await this.attachRelations([row]);
    return detail ?? null;
  }

  async create(input: {
    borrowRequestId: number;
    receivedByExternalUserId: string;
    note?: string;
    returnedAt: Date;
  }) {
    const [record] = await this.db
      .insert(returnTransactions)
      .values({
        borrowRequestId: input.borrowRequestId,
        receivedByExternalUserId: input.receivedByExternalUserId,
        note: input.note ?? null,
        returnedAt: input.returnedAt,
      })
      .returning();

    return record;
  }

  async insertItems(
    returnTransactionId: number,
    items: ReturnCreateInput["items"],
  ) {
    return this.db
      .insert(returnTransactionItems)
      .values(
        items.map((item) => ({
          returnTransactionId,
          borrowRequestItemId: item.borrowRequestItemId,
          returnQty: item.returnQty,
          condition: item.condition,
          note: item.note ?? null,
        })),
      )
      .returning();
  }

  async updateNote(id: number, input: ReturnUpdateInput) {
    const [record] = await this.db
      .update(returnTransactions)
      .set({
        note: input.note,
      })
      .where(eq(returnTransactions.id, id))
      .returning();

    return record ?? null;
  }

  async sumReturnedByBorrowRequestItemIds(ids: number[]) {
    if (ids.length === 0) {
      return new Map<number, number>();
    }

    const rows = await this.db
      .select({
        borrowRequestItemId: returnTransactionItems.borrowRequestItemId,
        totalReturned: sql<number>`coalesce(sum(${returnTransactionItems.returnQty}), 0)`,
      })
      .from(returnTransactionItems)
      .where(inArray(returnTransactionItems.borrowRequestItemId, ids))
      .groupBy(returnTransactionItems.borrowRequestItemId);

    return new Map(rows.map((row) => [row.borrowRequestItemId, Number(row.totalReturned)]));
  }

  private async attachRelations(
    rows: Array<typeof returnTransactions.$inferSelect>,
  ): Promise<ReturnTransactionDetail[]> {
    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((row) => row.id);
    const borrowRequestIds = Array.from(new Set(rows.map((row) => row.borrowRequestId)));

    const [items, requests, borrowers] = await Promise.all([
      this.db
        .select({
          id: returnTransactionItems.id,
          returnTransactionId: returnTransactionItems.returnTransactionId,
          borrowRequestItemId: returnTransactionItems.borrowRequestItemId,
          assetId: borrowRequestItems.assetId,
          assetCode: assets.assetCode,
          assetName: assets.name,
          returnQty: returnTransactionItems.returnQty,
          condition: returnTransactionItems.condition,
          note: returnTransactionItems.note,
        })
        .from(returnTransactionItems)
        .innerJoin(
          borrowRequestItems,
          eq(returnTransactionItems.borrowRequestItemId, borrowRequestItems.id),
        )
        .innerJoin(assets, eq(borrowRequestItems.assetId, assets.id))
        .where(inArray(returnTransactionItems.returnTransactionId, ids)),
      this.db
        .select({
          id: borrowRequests.id,
          requestNo: borrowRequests.requestNo,
          borrowerExternalUserId: borrowRequests.borrowerExternalUserId,
        })
        .from(borrowRequests)
        .where(inArray(borrowRequests.id, borrowRequestIds)),
      this.db
        .select({
          externalUserId: localAuthUsers.externalUserId,
          fullName: localAuthUsers.fullName,
        })
        .from(localAuthUsers),
    ]);

    const itemsByReturnId = new Map<number, ReturnTransactionItemView[]>();

    for (const item of items) {
      const list = itemsByReturnId.get(item.returnTransactionId) ?? [];
      list.push({
        id: item.id,
        borrowRequestItemId: item.borrowRequestItemId,
        assetId: item.assetId,
        assetCode: item.assetCode,
        assetName: item.assetName,
        returnQty: item.returnQty,
        condition: item.condition,
        note: item.note,
      });
      itemsByReturnId.set(item.returnTransactionId, list);
    }

    const requestMap = new Map(requests.map((request) => [request.id, request]));
    const borrowerMap = new Map(
      borrowers.map((borrower) => [borrower.externalUserId, borrower.fullName]),
    );

    return rows.map((row) => ({
      ...row,
      borrowRequestNo:
        requestMap.get(row.borrowRequestId)?.requestNo ?? String(row.borrowRequestId),
      borrowerExternalUserId:
        requestMap.get(row.borrowRequestId)?.borrowerExternalUserId ?? "",
      borrowerName:
        borrowerMap.get(requestMap.get(row.borrowRequestId)?.borrowerExternalUserId ?? "") ??
        requestMap.get(row.borrowRequestId)?.borrowerExternalUserId ??
        "",
      items: itemsByReturnId.get(row.id) ?? [],
    }));
  }
}
