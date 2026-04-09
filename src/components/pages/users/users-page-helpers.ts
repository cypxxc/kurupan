import type { ManagedUser } from "@/types/users";

import type { UserDraft } from "@/components/pages/users/users-page-types";

export function toActiveFilterValue(value: boolean) {
  return value ? "true" : "false";
}

export function getSourceLabel(source: ManagedUser["source"]) {
  void source;
  return "Local";
}

function toUserDraft(user: {
  role: ManagedUser["role"];
  isActive: boolean;
}): UserDraft {
  return {
    role: user.role,
    isActive: user.isActive,
  };
}

export function buildManagedUserDraftMap(users: ManagedUser[]) {
  return Object.fromEntries(
    users.map((user) => [user.externalUserId, toUserDraft(user)]),
  ) as Record<string, UserDraft>;
}
