import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const notificationTypeEnum = pgEnum("notification_type", [
  "borrow_request_created",
  "borrow_request_approved",
  "borrow_request_rejected",
  "borrow_request_cancelled",
  "return_recorded",
  "due_date_approaching",
  "overdue",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    recipientExternalUserId: varchar("recipient_external_user_id", { length: 255 }).notNull(),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    entityType: varchar("entity_type", { length: 64 }),
    entityId: varchar("entity_id", { length: 64 }),
    dedupeKey: varchar("dedupe_key", { length: 255 }),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_recipient_idx").on(table.recipientExternalUserId),
    index("notifications_recipient_created_at_id_idx").on(
      table.recipientExternalUserId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index("notifications_recipient_unread_idx").on(table.recipientExternalUserId, table.isRead),
    uniqueIndex("notifications_recipient_type_dedupe_idx").on(
      table.recipientExternalUserId,
      table.type,
      table.dedupeKey,
    ),
  ],
);
