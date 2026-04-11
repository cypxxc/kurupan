import { index, integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    actorExternalUserId: varchar("actor_external_user_id", { length: 255 }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    beforeData: jsonb("before_data"),
    afterData: jsonb("after_data"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_entity_type_idx").on(table.entityType),
    index("audit_logs_entity_id_idx").on(table.entityId),
    index("audit_logs_entity_type_entity_id_created_at_id_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_created_at_idx").on(table.createdAt),
    index("audit_logs_actor_external_user_id_idx").on(table.actorExternalUserId),
    index("audit_logs_created_at_actor_idx").on(table.createdAt, table.actorExternalUserId),
  ],
);
