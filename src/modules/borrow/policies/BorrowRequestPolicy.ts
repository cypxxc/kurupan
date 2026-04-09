import { AuthorizationError } from "@/lib/errors";
import { requireRole } from "@/lib/permissions";
import type { ActorContext } from "@/types/auth";

export class BorrowRequestPolicy {
  assertCanCreate(actor: ActorContext) {
    void actor;
  }

  assertCanView(actor: ActorContext, borrowerExternalUserId: string) {
    if (actor.role === "borrower" && actor.externalUserId !== borrowerExternalUserId) {
      throw new AuthorizationError("คุณสามารถดูได้เฉพาะคำขอยืมของตนเอง");
    }
  }

  assertCanApprove(actor: ActorContext) {
    requireRole(actor, ["staff", "admin"], "เฉพาะเจ้าหน้าที่หรือผู้ดูแลระบบเท่านั้นที่อนุมัติคำขอยืมได้");
  }
}
