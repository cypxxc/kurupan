import { sql } from "drizzle-orm";
import {
  check,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { assetCodeSeries } from "./asset-code-series";

export const assetStatusEnum = pgEnum("asset_status", ["available", "maintenance", "retired"]);

export const assets = pgTable(
  "assets",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    assetCode: varchar("asset_code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }),
    description: text("description"),
    location: text("location"),
    totalQty: integer("total_qty").notNull(),
    availableQty: integer("available_qty").notNull(),
    status: assetStatusEnum("status").notNull().default("available"),
    assetCodeSeriesId: integer("asset_code_series_id").references(() => assetCodeSeries.id, {
      onDelete: "set null",
    }),
    purchasePrice: numeric("purchase_price", { precision: 15, scale: 2 }),
    purchaseDate: date("purchase_date", { mode: "string" }),
    usefulLifeYears: integer("useful_life_years"),
    residualValue: numeric("residual_value", { precision: 15, scale: 2 }).default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("assets_total_qty_non_negative", sql`${table.totalQty} >= 0`),
    check("assets_available_qty_non_negative", sql`${table.availableQty} >= 0`),
    check("assets_available_qty_lte_total_qty", sql`${table.availableQty} <= ${table.totalQty}`),
  ],
);
