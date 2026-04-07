import type { SessionUser } from "@/lib/auth";

export function hasRole(
  user: SessionUser | null,
  roles: SessionUser["role"][],
): boolean {
  return user !== null && roles.includes(user.role);
}
