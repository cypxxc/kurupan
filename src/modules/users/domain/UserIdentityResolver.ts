import type { ManagedUser } from "@/types/users";
import { UserAccessRepository } from "@/modules/access/repositories/UserAccessRepository";
import type { LocalAuthUser } from "@/modules/auth/repositories/LocalAuthUserRepository";
import { LocalAuthUserRepository } from "@/modules/auth/repositories/LocalAuthUserRepository";

import {
  toLocalIdentity,
  toManagedUser,
  type IdentityUser,
} from "../services/user-management-service.helpers";

type ResolveAllFilters = {
  searchTerm: string;
  role?: "borrower" | "staff" | "admin";
  isActive?: boolean;
};

export class UserIdentityResolver {
  constructor(
    private readonly localAuthUserRepository: LocalAuthUserRepository,
    private readonly userAccessRepository: UserAccessRepository,
  ) {}

  async resolveById(id: string): Promise<IdentityUser | null> {
    const localUser = await this.localAuthUserRepository.findById(id);

    return localUser ? toLocalIdentity(localUser) : null;
  }

  async resolveAll(filters: ResolveAllFilters): Promise<ManagedUser[]> {
    const [localUsers, accessRows] = await Promise.all([
      this.localAuthUserRepository.findMany(
        filters.searchTerm ? { search: filters.searchTerm } : undefined,
      ),
      this.userAccessRepository.findMany({
        role: filters.role,
        isActive: filters.isActive,
        search: filters.searchTerm || undefined,
      }),
    ]);

    const localMap = this.buildLocalMap(localUsers);
    const accessMap = this.buildAccessMap(accessRows);
    const allIds = Array.from(new Set([...localMap.keys(), ...accessMap.keys()]));

    return allIds
      .map((externalUserId) => {
        const identity = localMap.get(externalUserId);

        return identity ? toManagedUser(identity, accessMap.get(externalUserId)) : null;
      })
      .filter((user): user is ManagedUser => Boolean(user));
  }

  private buildLocalMap(localUsers: LocalAuthUser[]) {
    return new Map(localUsers.map((user) => [user.externalUserId, toLocalIdentity(user)]));
  }

  private buildAccessMap(
    accessRows: Awaited<ReturnType<UserAccessRepository["findMany"]>>,
  ) {
    return new Map(accessRows.map((row) => [row.externalUserId, row]));
  }
}
