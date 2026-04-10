import {
  and,
  asc,
  count,
  eq,
  ilike,
  or,
  sql,
  type InferSelectModel,
  type SQL,
} from "drizzle-orm";

import { getDb, type DbExecutor } from "@/db/postgres";
import { localAuthUsers, userAccess } from "@/db/schema";
import {
  buildPaginatedResult,
  resolvePagination,
  type PaginatedResult,
} from "@/lib/pagination";
import type { UserListQuery } from "@/lib/validators/users";
import type { ManagedUser } from "@/types/users";

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

export type ManagedUserSummary = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  staffUsers: number;
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

function mapManagedUserRecord(record: {
  externalUserId: string;
  username: string;
  fullName: string;
  email: string | null;
  employeeCode: string | null;
  department: string | null;
  role: ManagedUser["role"];
  isActive: boolean;
  grantedByExternalUserId: string | null;
}): ManagedUser {
  return {
    externalUserId: record.externalUserId,
    username: record.username,
    fullName: record.fullName,
    email: record.email,
    employeeCode: record.employeeCode,
    department: record.department,
    role: record.role,
    isActive: record.isActive,
    source: "local",
    grantedByExternalUserId: record.grantedByExternalUserId,
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
            ilike(localAuthUsers.email, `%${filters.search}%`),
            ilike(localAuthUsers.employeeCode, `%${filters.search}%`),
            ilike(localAuthUsers.department, `%${filters.search}%`),
          ),
        )
      : await query;

    return records.map(mapRecord);
  }

  async findManagedUserPage(
    filters: UserListQuery,
    defaultLimit = 10,
  ): Promise<PaginatedResult<ManagedUser>> {
    const pagination = resolvePagination(filters, defaultLimit);
    const conditions = this.buildManagedUserConditions(filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const baseCountQuery = this.db
      .select({ total: count() })
      .from(localAuthUsers)
      .leftJoin(userAccess, eq(localAuthUsers.externalUserId, userAccess.externalUserId));
    const baseListQuery = this.db
      .select({
        externalUserId: localAuthUsers.externalUserId,
        username: localAuthUsers.username,
        fullName: localAuthUsers.fullName,
        email: localAuthUsers.email,
        employeeCode: localAuthUsers.employeeCode,
        department: localAuthUsers.department,
        role: sql<ManagedUser["role"]>`coalesce(${userAccess.role}::text, 'borrower')`,
        isActive: sql<boolean>`coalesce(${userAccess.isActive}, ${localAuthUsers.isActive})`,
        grantedByExternalUserId: userAccess.grantedByExternalUserId,
      })
      .from(localAuthUsers)
      .leftJoin(userAccess, eq(localAuthUsers.externalUserId, userAccess.externalUserId))
      .orderBy(asc(localAuthUsers.fullName), asc(localAuthUsers.externalUserId))
      .limit(pagination.limit)
      .offset(pagination.offset);

    const [[countRow], rows] = await Promise.all([
      whereClause ? baseCountQuery.where(whereClause) : baseCountQuery,
      whereClause ? baseListQuery.where(whereClause) : baseListQuery,
    ]);

    return buildPaginatedResult(
      rows.map(mapManagedUserRecord),
      Number(countRow?.total ?? 0),
      pagination,
    );
  }

  async getManagedUserSummary(): Promise<ManagedUserSummary> {
    const [row] = await this.db
      .select({
        totalUsers: count(),
        activeUsers:
          sql<number>`count(*) filter (where coalesce(${userAccess.isActive}, ${localAuthUsers.isActive}) = true)`,
        inactiveUsers:
          sql<number>`count(*) filter (where coalesce(${userAccess.isActive}, ${localAuthUsers.isActive}) = false)`,
        adminUsers:
          sql<number>`count(*) filter (where coalesce(${userAccess.role}::text, 'borrower') = 'admin')`,
        staffUsers:
          sql<number>`count(*) filter (where coalesce(${userAccess.role}::text, 'borrower') = 'staff')`,
      })
      .from(localAuthUsers)
      .leftJoin(userAccess, eq(localAuthUsers.externalUserId, userAccess.externalUserId));

    return {
      totalUsers: Number(row?.totalUsers ?? 0),
      activeUsers: Number(row?.activeUsers ?? 0),
      inactiveUsers: Number(row?.inactiveUsers ?? 0),
      adminUsers: Number(row?.adminUsers ?? 0),
      staffUsers: Number(row?.staffUsers ?? 0),
    };
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

  private buildManagedUserConditions(filters: UserListQuery) {
    const conditions: SQL<unknown>[] = [];
    const searchTerm = filters.search?.trim() ?? "";
    const resolvedRole = sql<ManagedUser["role"]>`coalesce(${userAccess.role}::text, 'borrower')`;
    const resolvedIsActive =
      sql<boolean>`coalesce(${userAccess.isActive}, ${localAuthUsers.isActive})`;

    if (filters.role) {
      conditions.push(sql`${resolvedRole} = ${filters.role}`);
    }

    if (filters.isActive !== undefined) {
      conditions.push(sql`${resolvedIsActive} = ${filters.isActive}`);
    }

    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`;

      conditions.push(
        or(
          ilike(localAuthUsers.username, searchPattern),
          ilike(localAuthUsers.fullName, searchPattern),
          ilike(localAuthUsers.externalUserId, searchPattern),
          ilike(localAuthUsers.email, searchPattern),
          ilike(localAuthUsers.employeeCode, searchPattern),
          ilike(localAuthUsers.department, searchPattern),
        ) ?? sql`false`,
      );
    }

    return conditions;
  }
}
