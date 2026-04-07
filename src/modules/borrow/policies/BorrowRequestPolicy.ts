import { AuthorizationError } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import type { ActorContext } from "@/types/auth";

export class BorrowRequestPolicy {
  assertCanCreate(actor: ActorContext) {
    void actor;
  }

  assertCanView(actor: ActorContext, borrowerExternalUserId: string) {
    if (actor.role === "borrower" && actor.externalUserId !== borrowerExternalUserId) {
      throw new AuthorizationError("You can only view your own borrow requests");
    }
  }

  assertCanApprove(actor: ActorContext) {
    requireRole(actor, ["staff", "admin"], "Only staff or admin can approve borrow requests");
  }
}
