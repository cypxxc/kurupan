import { AuditLogRepository } from "@/modules/audit/repositories/AuditLogRepository";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";

import { AssetPolicy } from "./policies/AssetPolicy";
import { AssetRepository } from "./repositories/AssetRepository";
import { AssetService } from "./services/AssetService";

export function createAssetStack() {
  const assetRepository = new AssetRepository();
  const auditLogRepository = new AuditLogRepository();
  const auditLogService = new AuditLogService(auditLogRepository);
  const assetPolicy = new AssetPolicy();
  const assetService = new AssetService(assetRepository, auditLogService, assetPolicy);

  return {
    assetRepository,
    auditLogRepository,
    auditLogService,
    assetPolicy,
    assetService,
  };
}
