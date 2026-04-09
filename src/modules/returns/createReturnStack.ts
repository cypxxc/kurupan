import { AuditLogRepository } from "@/modules/audit/repositories/AuditLogRepository";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { AssetRepository } from "@/modules/assets/repositories/AssetRepository";
import { BorrowRequestRepository } from "@/modules/borrow/repositories/BorrowRequestRepository";
import { createNotificationStack } from "@/modules/notifications/createNotificationStack";
import { ReturnService } from "@/modules/returns/services/ReturnService";

import { ReturnPolicy } from "./policies/ReturnPolicy";
import { ReturnRepository } from "./repositories/ReturnRepository";

export function createReturnStack() {
  const returnRepository = new ReturnRepository();
  const borrowRequestRepository = new BorrowRequestRepository();
  const assetRepository = new AssetRepository();
  const returnPolicy = new ReturnPolicy();
  const auditLogRepository = new AuditLogRepository();
  const auditLogService = new AuditLogService(auditLogRepository);
  const { notificationRepository, userAccessRepository, notificationService } =
    createNotificationStack();
  const returnService = new ReturnService(
    returnRepository,
    borrowRequestRepository,
    assetRepository,
    returnPolicy,
    auditLogService,
    notificationService,
  );

  return {
    returnRepository,
    borrowRequestRepository,
    assetRepository,
    returnPolicy,
    auditLogRepository,
    auditLogService,
    notificationRepository,
    userAccessRepository,
    notificationService,
    returnService,
  };
}
