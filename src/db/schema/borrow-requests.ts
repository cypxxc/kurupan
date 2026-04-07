import { sql } from "drizzle-orm";
import { check, date, integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { assets } from "./assets";

export const borrowRequestStatusEnum = pgEnum("borrow_request_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "partially_returned",
  "returned",
]);

export const borrowRequests = pgTable(
  "borrow_requests",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    requestNo: varchar("request_no", { length: 32 }).notNull().unique(),
    borrowerExternalUserId: varchar("borrower_external_user_id", { length: 255 }).notNull(),
    purpose: text("purpose"),
    startDate: date("start_date", { mode: "string" }).notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    status: borrowRequestStatusEnum("status").notNull().default("pending"),
    approvedByExternalUserId: varchar("approved_by_external_user_id", { length: 255 }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedByExternalUserId: varchar("rejected_by_external_user_id", { length: 255 }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    cancelledByExternalUserId: varchar("cancelled_by_external_user_id", { length: 255 }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("borrow_requests_due_date_gte_start_date", sql`${table.dueDate} >= ${table.startDate}`)],
);

export const borrowRequestItems = pgTable(
  "borrow_request_items",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    borrowRequestId: integer("borrow_request_id")
      .notNull()
      .references(() => borrowRequests.id, { onDelete: "cascade" }),
    assetId: integer("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),
    requestedQty: integer("requested_qty").notNull(),
    approvedQty: integer("approved_qty"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("borrow_request_items_requested_qty_positive", sql`${table.requestedQty} > 0`),
    check("borrow_request_items_approved_qty_positive", sql`${table.approvedQty} IS NULL OR ${table.approvedQty} > 0`),
    check("borrow_request_items_approved_qty_lte_requested_qty", sql`${table.approvedQty} IS NULL OR ${table.approvedQty} <= ${table.requestedQty}`),
  ],
);
