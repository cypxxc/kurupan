import type { ManagedUser } from "@/types/users";

export const ROLE_OPTIONS: Array<{ value: ManagedUser["role"]; label: string }> = [
  { value: "borrower", label: "Borrower" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
];

export const ACTIVE_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
] as const;
