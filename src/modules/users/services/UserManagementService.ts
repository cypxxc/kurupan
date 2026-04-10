import { hash } from "bcryptjs";

import { withTransactionContext } from "@/db/postgres";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type { PaginatedResult } from "@/lib/pagination";
import type { UserCreateInput, UserListQuery, UserUpdateInput } from "@/lib/validators/users";
import type { ActorContext } from "@/types/auth";
import type { ManagedUser } from "@/types/users";
import { AccessPolicy } from "@/modules/access/policies/AccessPolicy";
import { UserAccessRepository } from "@/modules/access/repositories/UserAccessRepository";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { LocalAuthUserRepository } from "@/modules/auth/repositories/LocalAuthUserRepository";

import { UserIdentityResolver } from "../domain/UserIdentityResolver";
import {
  toLocalIdentity,
  toManagedUser,
  type IdentityUser,
} from "./user-management-service.helpers";

export class UserManagementService {
  constructor(
    private readonly localAuthUserRepository: LocalAuthUserRepository,
    private readonly userAccessRepository: UserAccessRepository,
    private readonly accessPolicy: AccessPolicy,
    private readonly auditLogService: AuditLogService,
    private readonly userIdentityResolver: UserIdentityResolver = new UserIdentityResolver(
      localAuthUserRepository,
      userAccessRepository,
    ),
  ) {}

  private resolveIdentity(id: string): Promise<IdentityUser | null> {
    return this.userIdentityResolver.resolveById(id);
  }

  async listUsers(
    actor: ActorContext,
    filters: UserListQuery,
  ): Promise<PaginatedResult<ManagedUser>> {
    this.accessPolicy.assertCanManageAccess(actor);

    return this.localAuthUserRepository.findManagedUserPage(filters);
  }

  async getUserSummary(actor: ActorContext) {
    this.accessPolicy.assertCanManageAccess(actor);

    return this.localAuthUserRepository.getManagedUserSummary();
  }

  async getUserById(actor: ActorContext, id: string): Promise<ManagedUser> {
    this.accessPolicy.assertCanManageAccess(actor);

    const identity = await this.resolveIdentity(id);

    if (!identity) {
      throw new NotFoundError("User not found", { userId: id });
    }

    const access = await this.userAccessRepository.findByExternalUserId(identity.externalUserId);

    return toManagedUser(identity, access);
  }

  async createUser(actor: ActorContext, input: UserCreateInput): Promise<ManagedUser> {
    this.accessPolicy.assertCanManageAccess(actor);

    const externalUserId = input.externalUserId ?? input.username;
    const existing = await this.localAuthUserRepository.existsByIdentity({
      externalUserId,
      username: input.username,
    });

    if (existing) {
      throw new ConflictError(
        "A user with this username or external user ID already exists",
        existing,
      );
    }

    const passwordHash = await hash(input.password, 10);

    return withTransactionContext(async (ctx) => {
      const user = await ctx.localAuthUserRepo.create({
        externalUserId,
        username: input.username,
        passwordHash,
        fullName: input.fullName,
        email: input.email ?? null,
        employeeCode: input.employeeCode ?? null,
        department: input.department ?? null,
        isActive: input.isActive,
      });
      const access = await ctx.userAccessRepo.upsert({
        externalUserId,
        role: input.role,
        isActive: input.isActive,
        grantedByExternalUserId: actor.externalUserId,
      });
      const managedUser = toManagedUser(toLocalIdentity(user), access);

      await ctx.auditService.record({
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
      throw new ConflictError(
        "Admins cannot remove their own admin access or deactivate themselves",
      );
    }

    const localUser = await this.localAuthUserRepository.findById(existing.externalUserId);

    return withTransactionContext(async (ctx) => {
      const updatedLocalUser = localUser
        ? await ctx.localAuthUserRepo.updateByExternalUserId(existing.externalUserId, {
            fullName: input.fullName,
            email: input.email,
            employeeCode: input.employeeCode,
            department: input.department,
            isActive: input.isActive,
            passwordHash: input.password ? await hash(input.password, 10) : undefined,
          })
        : null;

      const access = await ctx.userAccessRepo.upsert({
        externalUserId: existing.externalUserId,
        role: input.role ?? existing.role,
        isActive: input.isActive ?? existing.isActive,
        grantedByExternalUserId: actor.externalUserId,
      });

      const identity =
        updatedLocalUser !== null
          ? toLocalIdentity(updatedLocalUser)
          : await this.resolveIdentity(existing.externalUserId);

      if (!identity) {
        throw new NotFoundError("User not found", { userId: existing.externalUserId });
      }

      const managedUser = toManagedUser(identity, access);

      await ctx.auditService.record({
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
