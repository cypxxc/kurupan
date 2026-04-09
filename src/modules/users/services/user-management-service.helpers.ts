import type { LocalAuthUser } from "@/modules/auth/repositories/LocalAuthUserRepository";
import type { ManagedUser } from "@/types/users";

export type ManagedAccessRow = {
  externalUserId: string;
  role: "borrower" | "staff" | "admin";
  isActive: boolean;
  grantedByExternalUserId: string | null;
};

export type IdentityUser = { source: "local" } & LocalAuthUser;

export function toLocalIdentity(user: LocalAuthUser): IdentityUser {
  return {
    ...user,
    source: "local",
  };
}

export function toManagedUser(
  identity: IdentityUser,
  access?: ManagedAccessRow | null,
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

export function matchesManagedUserSearch(user: ManagedUser, searchQuery: string) {
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
}
