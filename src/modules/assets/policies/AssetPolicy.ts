import { requireRole } from "@/lib/permissions";
import type { ActorContext } from "@/types/auth";

export class AssetPolicy {
  assertCanManage(actor: ActorContext) {
    requireRole(actor, ["staff", "admin"], "Only staff or admin can manage assets");
  }
}
