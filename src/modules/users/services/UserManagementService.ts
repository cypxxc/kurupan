import { hash } from "bcryptjs";

import { withTransaction } from "@/db/postgres";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type {
  LegacyUserSearchQuery,
  UserCreateInput,
  UserListQuery,
  UserUpdateInput,
} from "@/lib/validators/users";
import type { ActorContext } from "@/types/auth";
import type { LegacySearchUser, ManagedUser } from "@/types/users";
import { AuditLogRepository } from "@/modules/audit/repositories/AuditLogRepository";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { AccessPolicy } from "@/modules/access/policies/AccessPolicy";
import { UserAccessRepository } from "@/modules/access/repositories/UserAccessRepository";
import {
  LegacyUserRepository,
  type LegacyUser,
} from "@/modules/auth/repositories/LegacyUserRepository";
import {
  LocalAuthUserRepository,
  type LocalAuthUser,
} from "@/modules/auth/repositories/LocalAuthUserRepository";

type IdentityUser =
  | ({ source: "local" } & LocalAuthUser)
  | ({ source: "legacy" } & LegacyUser);

export class UserManagementService {
  constructor(
    private readonly localAuthUserRepository: LocalAuthUserRepository,
    private readonly legacyUserRepository: LegacyUserRepository,
    private readonly userAccessRepository: UserAccessRepository,
    private readonly accessPolicy: AccessPolicy,
    private readonly auditLogService: AuditLogService,
  ) {}

  private toManagedUser(
    identity: IdentityUser,
    access?: {
      role: "borrower" | "staff" | "admin";
      isActive: boolean;
      grantedByExternalUserId: string | null;
    } | null,
  ): ManagedUser {
    return {
      externalUserId: identity.externalUserId,
      username: identity.username,
      fullName: identity.fullName,
      email: identity.email,
      employeeCode: identity.employeeCode,
      department: identity.department,
      role: access?.role ?? "borrower",
      isActive: access?.isActive ?? identity.isOrgActive,
      source: identity.source,
      grantedByExternalUserId: access?.grantedByExternalUserId ?? null,
    };
  }

  private async resolveIdentity(id: string): Promise<IdentityUser | null> {
    const localUser = await this.localAuthUserRepository.findById(id);

    if (localUser) {
      return {
        ...localUser,
        source: "local",
      };
    }

    const legacyUser = await this.legacyUserRepository.findById(id);

    if (!legacyUser) {
      return null;
    }

    return {
      ...legacyUser,
      source: "legacy",
    };
  }

  async listUsers(actor: ActorContext, filters: UserListQuery): Promise<ManagedUser[]> {
    this.accessPolicy.assertCanManageAccess(actor);

    const [localUsers, accessRows] = await Promise.all([
      this.localAuthUserRepository.findMany(),
      this.userAccessRepository.findMany({
        role: filters.role,
        isActive: filters.isActive,
      }),
    ]);

    const localMap = new Map(
      localUsers.map((user) => [
        user.externalUserId,
        {
          ...user,
          source: "local" as const,
        },
      ]),
    );
    const accessMap = new Map(accessRows.map((row) => [row.externalUserId, row]));

    const accessOnlyIds = accessRows
      .map((row) => row.externalUserId)
      .filter((externalUserId) => !localMap.has(externalUserId));

    const legacyUsers = await this.legacyUserRepository.batchFindByIds(accessOnlyIds);
    const legacyMap = new Map(
      legacyUsers.map((user) => [
        user.externalUserId,
        {
          ...user,
          source: "legacy" as const,
        },
      ]),
    );

    const allIds = Array.from(new Set([...localMap.keys(), ...accessMap.keys()]));
    const searchQuery = filters.search.trim().toLowerCase();

    return allIds
      .map((externalUserId) => {
        const identity = localMap.get(externalUserId) ?? legacyMap.get(externalUserId);

        if (!identity) {
          return null;
        }

        return this.toManagedUser(identity, accessMap.get(externalUserId));
      })
      .filter((user): user is ManagedUser => Boolean(user))
      .filter((user) => {
        if (filters.role && user.role !== filters.role) {
          return false;
        }

        if (filters.isActive !== undefined && user.isActive !== filters.isActive) {
          return false;
        }

        if (!searchQuery) {
          return true;
        }

        return [
          user.username,
          user.fullName,
          user.externalUserId,
          user.email ?? "",
          user.employeeCode ?? "",
          user.department ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchQuery);
      })
      .sort((left, right) => left.fullName.localeCompare(right.fullName));
  }

  async getUserById(actor: ActorContext, id: string): Promise<ManagedUser> {
    this.accessPolicy.assertCanManageAccess(actor);

    const identity = await this.resolveIdentity(id);

    if (!identity) {
      throw new NotFoundError("User not found", { userId: id });
    }

    const access = await this.userAccessRepository.findByExternalUserId(identity.externalUserId);

    return this.toManagedUser(identity, access);
  }

  async searchLegacyUsers(
    actor: ActorContext,
    query: LegacyUserSearchQuery,
  ): Promise<LegacySearchUser[]> {
    this.accessPolicy.assertCanManageAccess(actor);

    const results = await this.legacyUserRepository.searchUsers(query.query, {
      limit: 20,
      offset: 0,
    });

    const accessRows = await this.userAccessRepository.findByExternalUserIds(
      results.map((user) => user.externalUserId),
    );
    const accessMap = new Map(accessRows.map((row) => [row.externalUserId, row]));

    return results.map((user) => {
      const access = accessMap.get(user.externalUserId);

      return {
        externalUserId: user.externalUserId,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        employeeCode: user.employeeCode,
        department: user.department,
        isActiveInOrg: user.isOrgActive,
        isManaged: Boolean(access),
        currentRole: access?.role ?? "borrower",
        currentIsActive: access?.isActive ?? user.isOrgActive,
      };
    });
  }

  async createUser(actor: ActorContext, input: UserCreateInput): Promise<ManagedUser> {
    this.accessPolicy.assertCanManageAccess(actor);

    const externalUserId = input.externalUserId ?? input.username;
    const existing = await this.localAuthUserRepository.existsByIdentity({
      externalUserId,
      username: input.username,
    });

    if (existing) {
      throw new ConflictError("Username or external user ID already exists", existing);
    }

    const passwordHash = await hash(input.password, 10);

    return withTransaction(async (tx) => {
      const localAuthUserRepository = new LocalAuthUserRepository(tx);
      const userAccessRepository = new UserAccessRepository(tx);
      const auditLogService = new AuditLogService(new AuditLogRepository(tx));

      const user = await localAuthUserRepository.create({
        externalUserId,
        username: input.username,
        passwordHash,
        fullName: input.fullName,
        email: input.email ?? null,
        employeeCode: input.employeeCode ?? null,
        department: input.department ?? null,
        isActive: input.isActive,
      });

      const access = await userAccessRepository.upsert({
        externalUserId,
        role: input.role,
        isActive: input.isActive,
        grantedByExternalUserId: actor.externalUserId,
      });

      const managedUser = this.toManagedUser(
        {
          ...user,
          source: "local",
        },
        access,
      );

      await auditLogService.record({
        actor,
        action: "user.create",
        entityType: "user",
        entityId: managedUser.externalUserId,
        afterData: managedUser,
      });

      return managedUser;
    });
  }

  async updateUser(actor: ActorContext, id: string, input: UserUpdateInput): Promise<ManagedUser> {
    this.accessPolicy.assertCanManageAccess(actor);

    const existing = await this.getUserById(actor, id);

    if (
      existing.externalUserId === actor.externalUserId &&
      ((input.role && input.role !== "admin") || input.isActive === false)
    ) {
      throw new ConflictError("Admins cannot remove their own admin access or deactivate themselves");
    }

    const localUser = await this.localAuthUserRepository.findById(existing.externalUserId);

    return withTransaction(async (tx) => {
      const localAuthUserRepository = new LocalAuthUserRepository(tx);
      const userAccessRepository = new UserAccessRepository(tx);
      const auditLogService = new AuditLogService(new AuditLogRepository(tx));

      const updatedLocalUser = localUser
        ? await localAuthUserRepository.updateByExternalUserId(existing.externalUserId, {
            fullName: input.fullName,
            email: input.email,
            employeeCode: input.employeeCode,
            department: input.department,
            isActive: input.isActive,
            passwordHash: input.password ? await hash(input.password, 10) : undefined,
          })
        : null;

      const access = await userAccessRepository.upsert({
        externalUserId: existing.externalUserId,
        role: input.role ?? existing.role,
        isActive: input.isActive ?? existing.isActive,
        grantedByExternalUserId: actor.externalUserId,
      });

      const identity =
        updatedLocalUser !== null
          ? {
              ...updatedLocalUser,
              source: "local" as const,
            }
          : await this.resolveIdentity(existing.externalUserId);

      if (!identity) {
        throw new NotFoundError("User not found", { userId: existing.externalUserId });
      }

      const managedUser = this.toManagedUser(identity, access);

      await auditLogService.record({
        actor,
        action: "user.update",
        entityType: "user",
        entityId: managedUser.externalUserId,
        beforeData: existing,
        afterData: managedUser,
      });

      return managedUser;
    });
  }
}
