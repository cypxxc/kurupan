import { requireRole } from "@/lib/permissions";
import type { ActorContext } from "@/types/auth";

export class ReturnPolicy {
  assertCanManageReturns(actor: ActorContext) {
    requireRole(actor, ["staff", "admin"], "เฉพาะเจ้าหน้าที่หรือผู้ดูแลระบบเท่านั้นที่บันทึกการคืนได้");
  }

  assertCanView(actor: ActorContext, borrowerExternalUserId: string) {
    if (actor.role === "borrower" && actor.externalUserId !== borrowerExternalUserId) {
      requireRole(actor, ["staff", "admin"], "คุณไม่มีสิทธิ์ดูรายการคืนนี้");
    }
  }
}
