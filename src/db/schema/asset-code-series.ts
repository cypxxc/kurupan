import { integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const assetCodeSeries = pgTable("asset_code_series", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  prefix: varchar("prefix", { length: 20 }).notNull(),
  separator: varchar("separator", { length: 5 }).notNull().default("-"),
  padLength: integer("pad_length").notNull().default(4),
  counter: integer("counter").notNull().default(0),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
