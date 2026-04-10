import { and, count, desc, eq, sql } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/db/postgres";
import { notifications } from "@/db/schema";

export type NotificationRecord = typeof notifications.$inferSelect;
export type NotificationType = NotificationRecord["type"];
export type NotificationEntityType = "borrow_request" | "return_transaction";

type NotificationCreateInput = {
  recipientExternalUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: NotificationEntityType | null;
  entityId?: string | null;
  dedupeKey?: string | null;
};

export class NotificationRepository {
  constructor(private readonly db: DbExecutor = getDb()) {}

  async create(input: NotificationCreateInput): Promise<NotificationRecord | null> {
    const values = {
      recipientExternalUserId: input.recipientExternalUserId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      dedupeKey: input.dedupeKey ?? null,
    };

    if (input.dedupeKey) {
      const [record] = await this.db
        .insert(notifications)
        .values(values)
        .onConflictDoNothing({
          target: [
            notifications.recipientExternalUserId,
            notifications.type,
            notifications.dedupeKey,
          ],
        })
        .returning();

      return record ?? null;
    }

    const [record] = await this.db.insert(notifications).values(values).returning();

    return record ?? null;
  }

  async findMany(recipientExternalUserId: string, limit = 30): Promise<NotificationRecord[]> {
    return this.db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientExternalUserId, recipientExternalUserId))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(limit);
  }

  async countUnread(recipientExternalUserId: string): Promise<number> {
    const [result] = await this.db
      .select({
        count: count(),
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientExternalUserId, recipientExternalUserId),
          eq(notifications.isRead, false),
        ),
      );

    return Number(result?.count ?? 0);
  }

  async markRead(id: number, recipientExternalUserId: string): Promise<NotificationRecord | null> {
    const [existing] = await this.db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientExternalUserId, recipientExternalUserId),
        ),
      )
      .limit(1);

    if (!existing) {
      return null;
    }

    if (existing.isRead) {
      return existing;
    }

    const [updated] = await this.db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(notifications.id, id))
      .returning();

    return updated ?? null;
  }

  async markAllRead(recipientExternalUserId: string): Promise<number> {
    const updated = await this.db
      .update(notifications)
      .set({
        isRead: true,
        readAt: sql`coalesce(${notifications.readAt}, now())`,
      })
      .where(
        and(
          eq(notifications.recipientExternalUserId, recipientExternalUserId),
          eq(notifications.isRead, false),
        ),
      )
      .returning({ id: notifications.id });

    return updated.length;
  }
}
