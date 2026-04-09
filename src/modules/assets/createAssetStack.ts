import { AssetCodeSeriesRepository } from "@/modules/asset-code-series/repositories/AssetCodeSeriesRepository";
import { AuditLogRepository } from "@/modules/audit/repositories/AuditLogRepository";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";

import { AssetPolicy } from "./policies/AssetPolicy";
import { AssetImageRepository } from "./repositories/AssetImageRepository";
import { AssetRepository } from "./repositories/AssetRepository";
import { AssetService } from "./services/AssetService";

export function createAssetStack() {
  const assetRepository = new AssetRepository();
  const assetImageRepository = new AssetImageRepository();
  const assetCodeSeriesRepository = new AssetCodeSeriesRepository();
  const auditLogRepository = new AuditLogRepository();
  const auditLogService = new AuditLogService(auditLogRepository);
  const assetPolicy = new AssetPolicy();
  const assetService = new AssetService(
    assetRepository,
    assetImageRepository,
    assetCodeSeriesRepository,
    auditLogService,
    assetPolicy,
  );

  return {
    assetRepository,
    assetImageRepository,
    assetCodeSeriesRepository,
    auditLogRepository,
    auditLogService,
    assetPolicy,
    assetService,
  };
}
