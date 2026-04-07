import { integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const auditLogs = pgTable("audit_logs", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  actorExternalUserId: varchar("actor_external_user_id", { length: 255 }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
