import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { assets } from "./assets";

export const assetImages = pgTable(
  "asset_images",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    assetId: integer("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("asset_images_asset_id_idx").on(table.assetId),
    index("asset_images_asset_id_sort_order_idx").on(table.assetId, table.sortOrder),
  ],
);
