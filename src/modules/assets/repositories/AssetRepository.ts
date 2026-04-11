import { and, asc, count, eq, getTableColumns, gte, inArray, isNotNull, sql } from "drizzle-orm";

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
import { measureAsyncOperation } from "@/lib/performance";
import type { AssetActivity } from "@/types/assets";

export type AssetDashboardSummary = {
  totalAssets: number;
  availableAssets: number;
  maintenanceAssets: number;
  retiredAssets: number;
  borrowableAssets: number;
};

export type AssetFieldOptions = {
  categories: string[];
  locations: string[];
};

const assetAvailabilitySortOrder = sql<number>`case when ${assets.availableQty} = 0 then 1 else 0 end`;
const assetSearchDocument = sql<string>`lower(${assets.name} || ' ' || ${assets.assetCode})`;

function buildAssetSearchPattern(search: string) {
  return `%${search.trim().toLowerCase()}%`;
}

export class AssetRepository {
  constructor(private readonly db: DbExecutor = getDb()) {}

  private readonly listSelect = {
    ...getTableColumns(assets),
    primaryImageUrl: sql<string | null>`(
      select ${assetImages.url}
      from ${assetImages}
      where ${assetImages.assetId} = ${assets.id}
      order by ${assetImages.sortOrder} asc, ${assetImages.id} asc
      limit 1
    )`,
  };

  private readonly listOrder = [
    assetAvailabilitySortOrder,
    asc(assets.assetCode),
  ] as const;

  async findMany(filters: AssetListQuery) {
    const conditions = this.buildConditions(filters);

    const query = this.db.select(this.listSelect).from(assets).orderBy(...this.listOrder);
    const records =
      conditions.length > 0 ? await query.where(and(...conditions)) : await query;

    return records;
  }

  async findPage(
    filters: AssetListQuery,
    defaultLimit = 10,
  ): Promise<PaginatedResult<Awaited<ReturnType<AssetRepository["findMany"]>>[number]>> {
    return measureAsyncOperation(
      "db.assets.findPage",
      async () => {
        const conditions = this.buildConditions(filters);
        const pagination = resolvePagination(filters, defaultLimit);
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const baseCountQuery = this.db
          .select({ total: count() })
          .from(assets);
        const baseListQuery = this.db
          .select(this.listSelect)
          .from(assets)
          .orderBy(...this.listOrder)
          .limit(pagination.limit);
        const [[countRow], items] = await Promise.all([
          whereClause ? baseCountQuery.where(whereClause) : baseCountQuery,
          whereClause
            ? baseListQuery.where(whereClause).offset(pagination.offset)
            : baseListQuery.offset(pagination.offset),
        ]);

        return buildPaginatedResult(items, countRow?.total ?? 0, pagination);
      },
      {
        context: {
          page: filters.page,
          limit: filters.limit,
          search: filters.search,
          category: filters.category,
          location: filters.location,
          status: filters.status,
          stock: filters.stock,
          borrowable: filters.borrowable,
        },
      },
    );
  }

  async getDashboardSummary(): Promise<AssetDashboardSummary> {
    return measureAsyncOperation("db.assets.getDashboardSummary", async () => {
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
    });
  }

  async getFieldOptions(): Promise<AssetFieldOptions> {
    return measureAsyncOperation("db.assets.getFieldOptions", async () => {
      const [categoryRows, locationRows] = await Promise.all([
        this.db
          .selectDistinct({ value: assets.category })
          .from(assets)
          .where(isNotNull(assets.category))
          .orderBy(sql`${assets.category} asc`),
        this.db
          .selectDistinct({ value: assets.location })
          .from(assets)
          .where(isNotNull(assets.location))
          .orderBy(sql`${assets.location} asc`),
      ]);

      return {
        categories: categoryRows.map((row) => row.value as string),
        locations: locationRows.map((row) => row.value as string),
      };
    });
  }

  async findById(id: number) {
    return measureAsyncOperation(
      "db.assets.findById",
      async () => {
        const [record] = await this.db
          .select(this.listSelect)
          .from(assets)
          .where(eq(assets.id, id))
          .limit(1);

        return record ?? null;
      },
      {
        context: {
          assetId: id,
        },
      },
    );
  }

  async findByIds(ids: number[]) {
    if (ids.length === 0) {
      return [];
    }

    const records = await this.db
      .select(this.listSelect)
      .from(assets)
      .where(inArray(assets.id, ids));

    return records;
  }

  async findByAssetCode(assetCode: string) {
    const [record] = await this.db
      .select(this.listSelect)
      .from(assets)
      .where(eq(assets.assetCode, assetCode))
      .limit(1);

    return record ?? null;
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

    return this.findById(record.id);
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
    return measureAsyncOperation(
      "db.assets.findActivityByAssetId",
      async () => {
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
      },
      {
        context: {
          assetId,
        },
      },
    );
  }

  private buildConditions(filters: AssetListQuery) {
    const conditions = [];

    if (filters.search) {
      conditions.push(sql`${assetSearchDocument} like ${buildAssetSearchPattern(filters.search)}`);
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

}
