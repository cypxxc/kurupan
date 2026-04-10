import { and, asc, count, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/db/postgres";
import {
  assetImages,
  assets,
  borrowRequestItems,
  borrowRequests,
  localAuthUsers,
  returnTransactionItems,
  returnTransactions,
} from "@/db/schema";
import type { AssetCreateInput, AssetListQuery, AssetUpdateInput } from "@/lib/validators/assets";
import {
  buildPaginatedResult,
  resolvePagination,
  type PaginatedResult,
} from "@/lib/pagination";
import type { AssetActivity } from "@/types/assets";

export type AssetDashboardSummary = {
  totalAssets: number;
  availableAssets: number;
  maintenanceAssets: number;
  retiredAssets: number;
  borrowableAssets: number;
};

export class AssetRepository {
  constructor(private readonly db: DbExecutor = getDb()) {}

  private readonly listOrder = [
    sql`case when ${assets.availableQty} = 0 then 1 else 0 end`,
    asc(assets.assetCode),
  ] as const;

  async findMany(filters: AssetListQuery) {
    const conditions = this.buildConditions(filters);

    const query = this.db.select().from(assets).orderBy(...this.listOrder);
    const records =
      conditions.length > 0 ? await query.where(and(...conditions)) : await query;

    return this.attachPrimaryImageUrls(records);
  }

  async findPage(
    filters: AssetListQuery,
    defaultLimit = 10,
  ): Promise<PaginatedResult<Awaited<ReturnType<AssetRepository["findMany"]>>[number]>> {
    const conditions = this.buildConditions(filters);
    const pagination = resolvePagination(filters, defaultLimit);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await this.db
      .select({ total: count() })
      .from(assets)
      .where(whereClause);

    const query = this.db
      .select()
      .from(assets)
      .orderBy(...this.listOrder)
      .limit(pagination.limit)
      .offset(pagination.offset);
    const records = whereClause ? await query.where(whereClause) : await query;
    const items = await this.attachPrimaryImageUrls(records);

    return buildPaginatedResult(items, countRow?.total ?? 0, pagination);
  }

  async getDashboardSummary(): Promise<AssetDashboardSummary> {
    const [row] = await this.db
      .select({
        totalAssets: count(),
        availableAssets:
          sql<number>`count(*) filter (where ${assets.status} = 'available')`,
        maintenanceAssets:
          sql<number>`count(*) filter (where ${assets.status} = 'maintenance')`,
        retiredAssets:
          sql<number>`count(*) filter (where ${assets.status} = 'retired')`,
        borrowableAssets:
          sql<number>`count(*) filter (where ${assets.status} = 'available' and ${assets.availableQty} > 0)`,
      })
      .from(assets);

    return {
      totalAssets: Number(row?.totalAssets ?? 0),
      availableAssets: Number(row?.availableAssets ?? 0),
      maintenanceAssets: Number(row?.maintenanceAssets ?? 0),
      retiredAssets: Number(row?.retiredAssets ?? 0),
      borrowableAssets: Number(row?.borrowableAssets ?? 0),
    };
  }

  async findById(id: number) {
    const [record] = await this.db
      .select()
      .from(assets)
      .where(eq(assets.id, id))
      .limit(1);

    if (!record) {
      return null;
    }

    return this.attachPrimaryImageUrl(record);
  }

  async findByIds(ids: number[]) {
    if (ids.length === 0) {
      return [];
    }

    const records = await this.db.select().from(assets).where(inArray(assets.id, ids));

    return this.attachPrimaryImageUrls(records);
  }

  async findByAssetCode(assetCode: string) {
    const [record] = await this.db
      .select()
      .from(assets)
      .where(eq(assets.assetCode, assetCode))
      .limit(1);

    if (!record) {
      return null;
    }

    return this.attachPrimaryImageUrl(record);
  }

  async countBySeriesId(seriesId: number) {
    const [record] = await this.db
      .select({ count: count() })
      .from(assets)
      .where(eq(assets.assetCodeSeriesId, seriesId));

    return record?.count ?? 0;
  }

  async countBorrowRequestItemsByAssetId(assetId: number) {
    const [record] = await this.db
      .select({ count: count() })
      .from(borrowRequestItems)
      .where(eq(borrowRequestItems.assetId, assetId));

    return record?.count ?? 0;
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
        assetCodeSeriesId: input.assetCodeSeriesId,
        purchasePrice:
          input.purchasePrice === null ? null : String(input.purchasePrice),
        purchaseDate: input.purchaseDate,
        usefulLifeYears: input.usefulLifeYears,
        residualValue:
          input.residualValue === null ? null : String(input.residualValue),
      })
      .returning();

    return {
      ...record,
      primaryImageUrl: null,
    };
  }

  async updateById(id: number, input: AssetUpdateInput) {
    const [record] = await this.db
      .update(assets)
      .set({
        ...input,
        purchasePrice:
          input.purchasePrice === undefined
            ? undefined
            : input.purchasePrice === null
              ? null
              : String(input.purchasePrice),
        residualValue:
          input.residualValue === undefined
            ? undefined
            : input.residualValue === null
              ? null
              : String(input.residualValue),
        updatedAt: new Date(),
      })
      .where(eq(assets.id, id))
      .returning();

    if (!record) {
      return null;
    }

    return this.attachPrimaryImageUrl(record);
  }

  async deleteById(id: number) {
    const [record] = await this.db
      .delete(assets)
      .where(eq(assets.id, id))
      .returning();

    if (!record) {
      return null;
    }

    return {
      ...record,
      primaryImageUrl: null,
    };
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

  async updateStatus(assetId: number, status: "available" | "maintenance" | "retired") {
    const [record] = await this.db
      .update(assets)
      .set({
        status,
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

  private buildConditions(filters: AssetListQuery) {
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

    if (filters.stock === "in_stock") {
      conditions.push(gte(assets.availableQty, 1));
    }

    if (filters.stock === "out_of_stock") {
      conditions.push(eq(assets.availableQty, 0));
    }

    if (filters.borrowable) {
      conditions.push(and(eq(assets.status, "available"), gte(assets.availableQty, 1)));
    }

    return conditions;
  }

  private async attachPrimaryImageUrls<T extends { id: number }>(records: T[]) {
    if (records.length === 0) {
      return records.map((record) => ({
        ...record,
        primaryImageUrl: null,
      }));
    }

    const imageRows = await this.db
      .select({
        assetId: assetImages.assetId,
        url: assetImages.url,
        sortOrder: assetImages.sortOrder,
      })
      .from(assetImages)
      .where(inArray(assetImages.assetId, records.map((record) => record.id)))
      .orderBy(asc(assetImages.assetId), asc(assetImages.sortOrder), asc(assetImages.id));

    const primaryImageByAssetId = new Map<number, string>();

    for (const image of imageRows) {
      if (!primaryImageByAssetId.has(image.assetId)) {
        primaryImageByAssetId.set(image.assetId, image.url);
      }
    }

    return records.map((record) => ({
      ...record,
      primaryImageUrl: primaryImageByAssetId.get(record.id) ?? null,
    }));
  }

  private async attachPrimaryImageUrl<T extends { id: number }>(record: T) {
    const [image] = await this.db
      .select({
        url: assetImages.url,
      })
      .from(assetImages)
      .where(eq(assetImages.assetId, record.id))
      .orderBy(asc(assetImages.sortOrder), asc(assetImages.id))
      .limit(1);

    return {
      ...record,
      primaryImageUrl: image?.url ?? null,
    };
  }
}
