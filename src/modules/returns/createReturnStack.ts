import { AuditLogRepository } from "@/modules/audit/repositories/AuditLogRepository";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { AssetRepository } from "@/modules/assets/repositories/AssetRepository";
import { BorrowRequestRepository } from "@/modules/borrow/repositories/BorrowRequestRepository";

import { ReturnPolicy } from "./policies/ReturnPolicy";
import { ReturnRepository } from "./repositories/ReturnRepository";
import { ReturnService } from "./services/ReturnService";

export function createReturnStack() {
  const returnRepository = new ReturnRepository();
  const borrowRequestRepository = new BorrowRequestRepository();
  const assetRepository = new AssetRepository();
  const returnPolicy = new ReturnPolicy();
  const auditLogRepository = new AuditLogRepository();
  const auditLogService = new AuditLogService(auditLogRepository);
  const returnService = new ReturnService(
    returnRepository,
    borrowRequestRepository,
    assetRepository,
    returnPolicy,
    auditLogService,
  );

  return {
    returnRepository,
    borrowRequestRepository,
    assetRepository,
    returnPolicy,
    auditLogRepository,
    auditLogService,
    returnService,
  };
}
