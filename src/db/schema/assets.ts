import { sql } from "drizzle-orm";
import { check, integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("assets_total_qty_non_negative", sql`${table.totalQty} >= 0`),
    check("assets_available_qty_non_negative", sql`${table.availableQty} >= 0`),
    check("assets_available_qty_lte_total_qty", sql`${table.availableQty} <= ${table.totalQty}`),
  ],
);
