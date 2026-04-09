import type { ManagedUser } from "@/types/users";

export type RoleFilter = "all" | ManagedUser["role"];
export type ActiveFilter = "all" | "true" | "false";

export type UserDraft = {
  role: ManagedUser["role"];
  isActive: boolean;
};

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error?: { message?: string } };

export type ManagedUserDraftMap = Record<string, UserDraft>;
