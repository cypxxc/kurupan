import { AuditLogRepository } from "@/modules/audit/repositories/AuditLogRepository";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { AssetRepository } from "@/modules/assets/repositories/AssetRepository";

import { BorrowRequestPolicy } from "./policies/BorrowRequestPolicy";
import { BorrowRequestRepository } from "./repositories/BorrowRequestRepository";
import { BorrowRequestService } from "./services/BorrowRequestService";

export function createBorrowStack() {
  const borrowRequestRepository = new BorrowRequestRepository();
  const assetRepository = new AssetRepository();
  const borrowRequestPolicy = new BorrowRequestPolicy();
  const auditLogRepository = new AuditLogRepository();
  const auditLogService = new AuditLogService(auditLogRepository);
  const borrowRequestService = new BorrowRequestService(
    borrowRequestRepository,
    assetRepository,
    borrowRequestPolicy,
    auditLogService,
  );

  return {
    borrowRequestRepository,
    assetRepository,
    borrowRequestPolicy,
    auditLogRepository,
    auditLogService,
    borrowRequestService,
  };
}
