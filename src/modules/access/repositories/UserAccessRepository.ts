import { and, eq, ilike, inArray } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/db/postgres";
import { userAccess } from "@/db/schema";

export class UserAccessRepository {
  constructor(private readonly db: DbExecutor = getDb()) {}

  async findByExternalUserId(externalUserId: string) {
    const [record] = await this.db
      .select()
      .from(userAccess)
      .where(eq(userAccess.externalUserId, externalUserId))
      .limit(1);

    return record ?? null;
  }

  async findMany(filters?: {
    role?: "borrower" | "staff" | "admin";
    isActive?: boolean;
    search?: string;
  }) {
    const conditions = [];

    if (filters?.role) {
      conditions.push(eq(userAccess.role, filters.role));
    }

    if (filters?.isActive !== undefined) {
      conditions.push(eq(userAccess.isActive, filters.isActive));
    }

    if (filters?.search) {
      conditions.push(ilike(userAccess.externalUserId, `%${filters.search}%`));
    }

    const query = this.db.select().from(userAccess);

    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }

    return query;
  }

  async findByExternalUserIds(externalUserIds: string[]) {
    if (externalUserIds.length === 0) {
      return [];
    }

    return this.db
      .select()
      .from(userAccess)
      .where(
        // drizzle inArray kept out earlier in this file to avoid broad diff
        // for this repository call-site, raw SQL isn't needed.
        // import added below.
        inArray(userAccess.externalUserId, externalUserIds),
      );
  }

  async findByGrantedByExternalUserIds(externalUserIds: string[]) {
    if (externalUserIds.length === 0) {
      return [];
    }

    return this.db
      .select()
      .from(userAccess)
      .where(inArray(userAccess.grantedByExternalUserId, externalUserIds));
  }

  async upsert(input: {
    externalUserId: string;
    role: "borrower" | "staff" | "admin";
    isActive: boolean;
    grantedByExternalUserId: string;
  }) {
    const existing = await this.findByExternalUserId(input.externalUserId);

    if (existing) {
      const [record] = await this.db
        .update(userAccess)
        .set({
          role: input.role,
          isActive: input.isActive,
          grantedByExternalUserId: input.grantedByExternalUserId,
          updatedAt: new Date(),
        })
        .where(eq(userAccess.externalUserId, input.externalUserId))
        .returning();

      return record;
    }

    const [record] = await this.db
      .insert(userAccess)
      .values({
        externalUserId: input.externalUserId,
        role: input.role,
        isActive: input.isActive,
        grantedByExternalUserId: input.grantedByExternalUserId,
      })
      .returning();

    return record;
  }
}
