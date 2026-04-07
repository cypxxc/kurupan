import type { Role } from "@/types/auth";

export type ManagedUser = {
  externalUserId: string;
  username: string;
  fullName: string;
  email: string | null;
  employeeCode: string | null;
  department: string | null;
  role: Role;
  isActive: boolean;
  source: "local" | "legacy";
  grantedByExternalUserId: string | null;
};

export type LegacySearchUser = {
  externalUserId: string;
  username: string;
  fullName: string;
  email: string | null;
  employeeCode: string | null;
  department: string | null;
  isActiveInOrg: boolean;
  isManaged: boolean;
  currentRole: Role;
  currentIsActive: boolean;
};
