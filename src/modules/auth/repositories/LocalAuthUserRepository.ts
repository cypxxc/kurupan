import { eq, ilike, or, type InferSelectModel } from "drizzle-orm";

import { getDb, type DbExecutor } from "@/db/postgres";
import { localAuthUsers } from "@/db/schema";

export type LocalAuthUser = {
  id?: number;
  externalUserId: string;
  username: string;
  employeeCode: string | null;
  fullName: string;
  email: string | null;
  department: string | null;
  passwordHash: string;
  isOrgActive: boolean;
};

function mapRecord(record: InferSelectModel<typeof localAuthUsers>): LocalAuthUser {
  return {
    id: record.id,
    externalUserId: record.externalUserId,
    username: record.username,
    employeeCode: record.employeeCode,
    fullName: record.fullName,
    email: record.email,
    department: record.department,
    passwordHash: record.passwordHash,
    isOrgActive: record.isActive,
  };
}

export class LocalAuthUserRepository {
  constructor(private readonly db: DbExecutor = getDb()) {}

  async findByUsername(username: string) {
    const [record] = await this.db
      .select()
      .from(localAuthUsers)
      .where(eq(localAuthUsers.username, username))
      .limit(1);

    return record ? mapRecord(record) : null;
  }

  async findById(externalUserId: string) {
    const [record] = await this.db
      .select()
      .from(localAuthUsers)
      .where(or(
        eq(localAuthUsers.externalUserId, externalUserId),
        eq(localAuthUsers.username, externalUserId),
      ))
      .limit(1);

    return record ? mapRecord(record) : null;
  }

  async findMany(filters?: { search?: string }) {
    const query = this.db
      .select()
      .from(localAuthUsers);

    const records = filters?.search
      ? await query.where(
          or(
            ilike(localAuthUsers.username, `%${filters.search}%`),
            ilike(localAuthUsers.fullName, `%${filters.search}%`),
            ilike(localAuthUsers.externalUserId, `%${filters.search}%`),
          ),
        )
      : await query;

    return records.map(mapRecord);
  }

  async create(input: {
    externalUserId: string;
    username: string;
    passwordHash: string;
    fullName: string;
    email?: string | null;
    employeeCode?: string | null;
    department?: string | null;
    isActive: boolean;
  }) {
    const [record] = await this.db
      .insert(localAuthUsers)
      .values({
        externalUserId: input.externalUserId,
        username: input.username,
        passwordHash: input.passwordHash,
        fullName: input.fullName,
        email: input.email ?? null,
        employeeCode: input.employeeCode ?? null,
        department: input.department ?? null,
        isActive: input.isActive,
      })
      .returning();

    return mapRecord(record);
  }

  async updateByExternalUserId(
    externalUserId: string,
    input: {
      passwordHash?: string;
      fullName?: string;
      email?: string | null;
      employeeCode?: string | null;
      department?: string | null;
      isActive?: boolean;
    },
  ) {
    const [record] = await this.db
      .update(localAuthUsers)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        or(
          eq(localAuthUsers.externalUserId, externalUserId),
          eq(localAuthUsers.username, externalUserId),
        ),
      )
      .returning();

    return record ? mapRecord(record) : null;
  }

  async existsByIdentity(identity: { externalUserId: string; username: string }) {
    const [record] = await this.db
      .select({
        externalUserId: localAuthUsers.externalUserId,
        username: localAuthUsers.username,
      })
      .from(localAuthUsers)
      .where(
        or(
          eq(localAuthUsers.externalUserId, identity.externalUserId),
          eq(localAuthUsers.username, identity.username),
        ),
      )
      .limit(1);

    return record ?? null;
  }
}
