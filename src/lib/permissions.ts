import { AuthorizationError } from "@/lib/errors";
import type { ActorContext, Role } from "@/types/auth";

export function hasRole(
  actor: ActorContext | null | undefined,
  roles: Role[],
): actor is ActorContext {
  return Boolean(actor && roles.includes(actor.role));
}

export function requireRole(
  actor: ActorContext | null | undefined,
  roles: Role[],
  message = "คุณไม่มีสิทธิ์ดำเนินการนี้",
) {
  if (!hasRole(actor, roles)) {
    const actualRole = actor === null || actor === undefined ? null : (actor as ActorContext).role;

    throw new AuthorizationError(message, {
      requiredRoles: roles,
      actualRole,
    });
  }

  return actor;
}
