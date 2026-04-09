import { requireRole } from "@/lib/permissions";
import type { ActorContext } from "@/types/auth";

export class AccessPolicy {
  assertCanManageAccess(actor: ActorContext) {
    requireRole(actor, ["admin"], "เฉพาะผู้ดูแลระบบเท่านั้นที่จัดการสิทธิ์ผู้ใช้ได้");
  }
}
