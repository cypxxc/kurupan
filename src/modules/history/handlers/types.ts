import type { AuditLogRecord } from "@/modules/audit/repositories/AuditLogRepository";
import type { HistoryEvent } from "@/types/history";

export interface HistoryEventHandler {
  canHandle(action: string): boolean;
  toEvent(log: AuditLogRecord): HistoryEvent | null;
}
