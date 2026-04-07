import { AuditLogRepository } from "./repositories/AuditLogRepository";
import { AuditLogService } from "./services/AuditLogService";

export function createAuditStack() {
  const auditLogRepository = new AuditLogRepository();
  const auditLogService = new AuditLogService(auditLogRepository);

  return {
    auditLogRepository,
    auditLogService,
  };
}
