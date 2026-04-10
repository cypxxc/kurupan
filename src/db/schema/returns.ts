import { sql } from "drizzle-orm";
import { check, index, integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { borrowRequestItems, borrowRequests } from "./borrow-requests";

export const returnConditionEnum = pgEnum("return_condition", ["good", "damaged", "lost"]);

export const returnTransactions = pgTable(
  "return_transactions",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    borrowRequestId: integer("borrow_request_id")
      .notNull()
      .references(() => borrowRequests.id, { onDelete: "restrict" }),
    receivedByExternalUserId: varchar("received_by_external_user_id", { length: 255 }).notNull(),
    note: text("note"),
    returnedAt: timestamp("returned_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("return_transactions_borrow_request_id_idx").on(table.borrowRequestId)],
);

export const returnTransactionItems = pgTable(
  "return_transaction_items",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    returnTransactionId: integer("return_transaction_id")
      .notNull()
      .references(() => returnTransactions.id, { onDelete: "cascade" }),
    borrowRequestItemId: integer("borrow_request_item_id")
      .notNull()
      .references(() => borrowRequestItems.id, { onDelete: "restrict" }),
    returnQty: integer("return_qty").notNull(),
    condition: returnConditionEnum("condition").notNull(),
    note: text("note"),
  },
  (table) => [check("return_transaction_items_return_qty_positive", sql`${table.returnQty} > 0`)],
);
