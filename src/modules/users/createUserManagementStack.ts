import { AuditLogRepository } from "@/modules/audit/repositories/AuditLogRepository";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { AccessPolicy } from "@/modules/access/policies/AccessPolicy";
import { UserAccessRepository } from "@/modules/access/repositories/UserAccessRepository";
import { LocalAuthUserRepository } from "@/modules/auth/repositories/LocalAuthUserRepository";

import { UserManagementService } from "./services/UserManagementService";

export function createUserManagementStack() {
  const localAuthUserRepository = new LocalAuthUserRepository();
  const userAccessRepository = new UserAccessRepository();
  const accessPolicy = new AccessPolicy();
  const auditLogRepository = new AuditLogRepository();
  const auditLogService = new AuditLogService(auditLogRepository);
  const userManagementService = new UserManagementService(
    localAuthUserRepository,
    userAccessRepository,
    accessPolicy,
    auditLogService,
  );

  return {
    localAuthUserRepository,
    userAccessRepository,
    accessPolicy,
    auditLogRepository,
    auditLogService,
    userManagementService,
  };
}
