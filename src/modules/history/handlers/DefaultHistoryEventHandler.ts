import type { HistoryEvent } from "@/types/history";
import type { AuditLogRecord } from "@/modules/audit/repositories/AuditLogRepository";

import { createHistoryEvent } from "./shared";
import type { HistoryEventHandler } from "./types";

export class DefaultHistoryEventHandler implements HistoryEventHandler {
  canHandle(): boolean {
    return true;
  }

  toEvent(log: AuditLogRecord) {
    return createHistoryEvent(log, {
      entityType: log.entityType as HistoryEvent["entityType"],
      reference: `${log.entityType} #${log.entityId}`,
      summary: log.action,
    });
  }
}
