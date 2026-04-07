import { requireRole } from "@/lib/permissions";
import type { ActorContext } from "@/types/auth";

export class ReturnPolicy {
  assertCanManageReturns(actor: ActorContext) {
    requireRole(actor, ["staff", "admin"], "Only staff or admin can record returns");
  }

  assertCanView(actor: ActorContext, borrowerExternalUserId: string) {
    if (actor.role === "borrower" && actor.externalUserId !== borrowerExternalUserId) {
      requireRole(actor, ["staff", "admin"], "You do not have permission to view this return");
    }
  }
}
