import { AuditLogRepository } from "@/modules/audit/repositories/AuditLogRepository";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";

import { AssetCodeSeriesPolicy } from "./policies/AssetCodeSeriesPolicy";
import { AssetCodeSeriesRepository } from "./repositories/AssetCodeSeriesRepository";
import { AssetCodeSeriesService } from "./services/AssetCodeSeriesService";

export function createAssetCodeSeriesStack() {
  const assetCodeSeriesRepository = new AssetCodeSeriesRepository();
  const assetCodeSeriesPolicy = new AssetCodeSeriesPolicy();
  const auditLogRepository = new AuditLogRepository();
  const auditLogService = new AuditLogService(auditLogRepository);
  const assetCodeSeriesService = new AssetCodeSeriesService(
    assetCodeSeriesRepository,
    assetCodeSeriesPolicy,
    auditLogService,
  );

  return {
    assetCodeSeriesRepository,
    assetCodeSeriesPolicy,
    auditLogRepository,
    auditLogService,
    assetCodeSeriesService,
  };
}
