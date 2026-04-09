import { requireRole } from "@/lib/permissions";
import type { ActorContext } from "@/types/auth";

export class AssetCodeSeriesPolicy {
  assertCanManage(actor: ActorContext) {
    requireRole(actor, ["staff", "admin"], "เฉพาะเจ้าหน้าที่หรือผู้ดูแลระบบเท่านั้น");
  }
}
