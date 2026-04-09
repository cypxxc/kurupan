import { asc, count, eq, sql } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/db/postgres";
import { assetCodeSeries, assets } from "@/db/schema";
import { NotFoundError } from "@/lib/errors";
import type {
  SeriesCreateInput,
  SeriesUpdateInput,
} from "@/lib/validators/asset-code-series";

function buildAssetCode(input: {
  prefix: string;
  separator: string;
  padLength: number;
  counter: number;
}) {
  return `${input.prefix}${input.separator}${String(input.counter).padStart(input.padLength, "0")}`;
}

export class AssetCodeSeriesRepository {
  constructor(private readonly db: DbExecutor = getDb()) {}

  async findMany() {
    return this.db.select().from(assetCodeSeries).orderBy(asc(assetCodeSeries.name));
  }

  async findById(id: number) {
    const [record] = await this.db
      .select()
      .from(assetCodeSeries)
      .where(eq(assetCodeSeries.id, id))
      .limit(1);

    return record ?? null;
  }

  async create(input: SeriesCreateInput) {
    const [record] = await this.db.insert(assetCodeSeries).values(input).returning();
    return record;
  }

  async updateById(id: number, input: SeriesUpdateInput) {
    const [record] = await this.db
      .update(assetCodeSeries)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(assetCodeSeries.id, id))
      .returning();

    return record ?? null;
  }

  async deleteById(id: number) {
    const [record] = await this.db
      .delete(assetCodeSeries)
      .where(eq(assetCodeSeries.id, id))
      .returning();

    return record ?? null;
  }

  async countAssignedAssets(id: number) {
    const [record] = await this.db
      .select({ count: count() })
      .from(assets)
      .where(eq(assets.assetCodeSeriesId, id));

    return record?.count ?? 0;
  }

  async previewNextCode(id: number) {
    const record = await this.findById(id);

    if (!record) {
      throw new NotFoundError("ไม่พบชุดรหัสครุภัณฑ์", { seriesId: id });
    }

    return buildAssetCode({
      prefix: record.prefix,
      separator: record.separator,
      padLength: record.padLength,
      counter: record.counter + 1,
    });
  }

  async claimNextCode(id: number, dbExecutor: DbExecutor = this.db) {
    const [record] = await dbExecutor
      .update(assetCodeSeries)
      .set({
        counter: sql`${assetCodeSeries.counter} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(assetCodeSeries.id, id))
      .returning();

    if (!record) {
      throw new NotFoundError("ไม่พบชุดรหัสครุภัณฑ์", { seriesId: id });
    }

    return buildAssetCode({
      prefix: record.prefix,
      separator: record.separator,
      padLength: record.padLength,
      counter: record.counter,
    });
  }
}
