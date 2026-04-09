import { asc, eq, inArray } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/db/postgres";
import { assetImages } from "@/db/schema";

type AssetImageInsert = {
  storageKey: string;
  url: string;
  sortOrder: number;
};

export class AssetImageRepository {
  constructor(private readonly db: DbExecutor = getDb()) {}

  async findByAssetId(assetId: number) {
    return this.db
      .select()
      .from(assetImages)
      .where(eq(assetImages.assetId, assetId))
      .orderBy(asc(assetImages.sortOrder), asc(assetImages.id));
  }

  async findByAssetIds(assetIds: number[]) {
    if (assetIds.length === 0) {
      return [];
    }

    return this.db
      .select()
      .from(assetImages)
      .where(inArray(assetImages.assetId, assetIds))
      .orderBy(asc(assetImages.assetId), asc(assetImages.sortOrder), asc(assetImages.id));
  }

  async replaceForAsset(assetId: number, images: AssetImageInsert[]) {
    await this.db.delete(assetImages).where(eq(assetImages.assetId, assetId));

    if (images.length === 0) {
      return [];
    }

    return this.db
      .insert(assetImages)
      .values(
        images.map((image) => ({
          assetId,
          storageKey: image.storageKey,
          url: image.url,
          sortOrder: image.sortOrder,
        })),
      )
      .returning();
  }
}
