import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { roleEnum } from "./users";

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey(),
    externalUserId: varchar("external_user_id", { length: 255 }).notNull(),
    effectiveRole: roleEnum("effective_role").notNull(),
    fullName: varchar("full_name", { length: 255 }),
    email: varchar("email", { length: 255 }),
    employeeCode: varchar("employee_code", { length: 50 }),
    department: varchar("department", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("sessions_external_user_id_idx").on(table.externalUserId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);
