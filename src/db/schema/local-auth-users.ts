import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const localAuthUsers = pgTable(
  "local_auth_users",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    externalUserId: varchar("external_user_id", { length: 255 }).notNull().unique(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    employeeCode: varchar("employee_code", { length: 50 }),
    department: varchar("department", { length: 255 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("local_auth_users_external_user_id_idx").on(table.externalUserId),
    index("local_auth_users_username_idx").on(table.username),
    index("local_auth_users_full_name_external_user_id_idx").on(
      table.fullName.asc(),
      table.externalUserId.asc(),
    ),
    index("local_auth_users_search_trgm_idx").using(
      "gin",
      sql`(lower(
        ${table.username}
        || ' '
        || ${table.fullName}
        || ' '
        || ${table.externalUserId}
        || ' '
        || coalesce(${table.email}, '')
        || ' '
        || coalesce(${table.employeeCode}, '')
        || ' '
        || coalesce(${table.department}, '')
      )) gin_trgm_ops`,
    ),
  ],
);
