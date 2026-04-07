import { and, asc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/db/postgres";
import {
  assets,
  borrowRequestItems,
  borrowRequests,
  localAuthUsers,
  returnTransactionItems,
  returnTransactions,
} from "@/db/schema";
import type { AssetCreateInput, AssetListQuery, AssetUpdateInput } from "@/lib/validators/assets";
import type { AssetActivity } from "@/types/assets";

export class AssetRepository {
  constructor(private readonly db: DbExecutor = getDb()) {}

  async findMany(filters: AssetListQuery) {
    const conditions = [];

    if (filters.search) {
      conditions.push(
        or(
          ilike(assets.name, `%${filters.search}%`),
          ilike(assets.assetCode, `%${filters.search}%`),
        ),
      );
    }

    if (filters.category) {
      conditions.push(eq(assets.category, filters.category));
    }

    if (filters.location) {
      conditions.push(eq(assets.location, filters.location));
    }

    if (filters.status) {
      conditions.push(eq(assets.status, filters.status));
    }

    const query = this.db.select().from(assets).orderBy(asc(assets.assetCode));

    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }

    return query;
  }

  async findById(id: number) {
    const [record] = await this.db
      .select()
      .from(assets)
      .where(eq(assets.id, id))
      .limit(1);

    return record ?? null;
  }

  async findByIds(ids: number[]) {
    if (ids.length === 0) {
      return [];
    }

    return this.db.select().from(assets).where(inArray(assets.id, ids));
  }

  async findByAssetCode(assetCode: string) {
    const [record] = await this.db
      .select()
      .from(assets)
      .where(eq(assets.assetCode, assetCode))
      .limit(1);

    return record ?? null;
  }

  async create(
    input: AssetCreateInput & {
      availableQty: number;
      status: "available" | "maintenance" | "retired";
    },
  ) {
    const [record] = await this.db
      .insert(assets)
      .values({
        assetCode: input.assetCode,
        name: input.name,
        category: input.category,
        description: input.description,
        location: input.location,
        totalQty: input.totalQty,
        availableQty: input.availableQty,
        status: input.status,
      })
      .returning();

    return record;
  }

  async updateById(id: number, input: AssetUpdateInput) {
    const [record] = await this.db
      .update(assets)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, id))
      .returning();

    return record ?? null;
  }

  async decrementAvailableQtyIfEnough(assetId: number, qty: number) {
    const [record] = await this.db
      .update(assets)
      .set({
        availableQty: sql`${assets.availableQty} - ${qty}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(assets.id, assetId),
          eq(assets.status, "available"),
          gte(assets.availableQty, qty),
        ),
      )
      .returning();

    return record ?? null;
  }

  async incrementAvailableQty(assetId: number, qty: number) {
    const [record] = await this.db
      .update(assets)
      .set({
        availableQty: sql`${assets.availableQty} + ${qty}`,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, assetId))
      .returning();

    return record ?? null;
  }

  async decrementTotalQty(assetId: number, qty: number) {
    const [record] = await this.db
      .update(assets)
      .set({
        totalQty: sql`${assets.totalQty} - ${qty}`,
        updatedAt: new Date(),
      })
      .where(and(eq(assets.id, assetId), gte(assets.totalQty, qty)))
      .returning();

    return record ?? null;
  }

  async findActivityByAssetId(assetId: number): Promise<AssetActivity[]> {
    const [borrowRows, returnRows] = await Promise.all([
      this.db
        .select({
          requestId: borrowRequests.id,
          requestNo: borrowRequests.requestNo,
          borrowerExternalUserId: borrowRequests.borrowerExternalUserId,
          borrowerName: localAuthUsers.fullName,
          qty: borrowRequestItems.approvedQty,
          occurredAt: borrowRequests.approvedAt,
          status: borrowRequests.status,
        })
        .from(borrowRequestItems)
        .innerJoin(borrowRequests, eq(borrowRequestItems.borrowRequestId, borrowRequests.id))
        .leftJoin(
          localAuthUsers,
          eq(borrowRequests.borrowerExternalUserId, localAuthUsers.externalUserId),
        )
        .where(
          and(
            eq(borrowRequestItems.assetId, assetId),
            gte(sql`coalesce(${borrowRequestItems.approvedQty}, 0)`, 1),
          ),
        ),
      this.db
        .select({
          transactionId: returnTransactions.id,
          requestNo: borrowRequests.requestNo,
          borrowerExternalUserId: borrowRequests.borrowerExternalUserId,
          borrowerName: localAuthUsers.fullName,
          qty: returnTransactionItems.returnQty,
          occurredAt: returnTransactions.returnedAt,
          condition: returnTransactionItems.condition,
          note: returnTransactionItems.note,
        })
        .from(returnTransactionItems)
        .innerJoin(
          borrowRequestItems,
          eq(returnTransactionItems.borrowRequestItemId, borrowRequestItems.id),
        )
        .innerJoin(
          returnTransactions,
          eq(returnTransactionItems.returnTransactionId, returnTransactions.id),
        )
        .innerJoin(borrowRequests, eq(returnTransactions.borrowRequestId, borrowRequests.id))
        .leftJoin(
          localAuthUsers,
          eq(borrowRequests.borrowerExternalUserId, localAuthUsers.externalUserId),
        )
        .where(eq(borrowRequestItems.assetId, assetId)),
    ]);

    const borrowActivity: AssetActivity[] = borrowRows.map((row) => ({
      id: `borrow-${row.requestId}`,
      type: "borrow",
      occurredAt: (row.occurredAt ?? new Date(0)).toISOString(),
      requestNo: row.requestNo,
      borrowerName: row.borrowerName ?? row.borrowerExternalUserId,
      qty: row.qty ?? 0,
      status: row.status,
      note: null,
    }));

    const returnActivity: AssetActivity[] = returnRows.map((row) => ({
      id: `return-${row.transactionId}-${row.qty}`,
      type: "return",
      occurredAt: row.occurredAt.toISOString(),
      requestNo: row.requestNo,
      borrowerName: row.borrowerName ?? row.borrowerExternalUserId,
      qty: row.qty,
      status: row.condition,
      note: row.note,
    }));

    return [...borrowActivity, ...returnActivity].sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt),
    );
  }
}
