import { AuditLogRepository } from "@/modules/audit/repositories/AuditLogRepository";

import { HistoryService } from "./services/HistoryService";

export function createHistoryStack() {
  const auditLogRepository = new AuditLogRepository();
  const historyService = new HistoryService(auditLogRepository);

  return {
    auditLogRepository,
    historyService,
  };
}
