import { requireRole } from "@/lib/permissions";
import type { ActorContext } from "@/types/auth";

export class AccessPolicy {
  assertCanManageAccess(actor: ActorContext) {
    requireRole(actor, ["admin"], "Only admins can manage user access");
  }
}
