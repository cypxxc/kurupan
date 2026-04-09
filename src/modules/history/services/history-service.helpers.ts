import type { AuditLogRecord } from "@/modules/audit/repositories/AuditLogRepository";

import {
  getBorrowRequestSnapshot,
  getReturnPayload,
} from "../handlers/shared";

export function logBelongsToBorrower(log: AuditLogRecord, externalUserId: string) {
  const borrowRequest = getBorrowRequestSnapshot(log);
  if (borrowRequest?.borrowerExternalUserId === externalUserId) {
    return true;
  }

  const returnPayload = getReturnPayload(log);
  if (returnPayload?.borrowRequest?.borrowerExternalUserId === externalUserId) {
    return true;
  }

  return log.actorExternalUserId === externalUserId;
}
