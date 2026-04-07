import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { roleEnum } from "./users";

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    externalUserId: varchar("external_user_id", { length: 255 }).notNull(),
    effectiveRole: roleEnum("effective_role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("sessions_external_user_id_idx").on(table.externalUserId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);
