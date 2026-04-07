import type { Role } from "@/types/auth";

import { UserAccessRepository } from "../repositories/UserAccessRepository";

export type ResolvedAccess = {
  externalUserId: string;
  role: Role;
  isActive: boolean;
};

export class AccessService {
  constructor(private readonly userAccessRepository: UserAccessRepository) {}

  async resolveAccess(externalUserId: string): Promise<ResolvedAccess> {
    const localAccess = await this.userAccessRepository.findByExternalUserId(externalUserId);

    if (!localAccess) {
      return {
        externalUserId,
        role: "borrower",
        isActive: true,
      };
    }

    return {
      externalUserId,
      role: localAccess.role,
      isActive: localAccess.isActive,
    };
  }
}
