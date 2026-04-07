import { boolean, index, integer, pgEnum, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["borrower", "staff", "admin"]);

export const userAccess = pgTable(
  "user_access",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    externalUserId: varchar("external_user_id", { length: 255 }).notNull().unique(),
    role: roleEnum("role").notNull().default("borrower"),
    isActive: boolean("is_active").notNull().default(true),
    grantedByExternalUserId: varchar("granted_by_external_user_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("user_access_external_user_id_idx").on(table.externalUserId)],
);
