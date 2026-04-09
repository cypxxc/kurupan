import type { AuditLogRecord } from "@/modules/audit/repositories/AuditLogRepository";
import type { HistoryEvent } from "@/types/history";

import { createAssetEventHandlers } from "./AssetEventHandlers";
import { createBorrowRequestEventHandlers } from "./BorrowRequestEventHandlers";
import { DefaultHistoryEventHandler } from "./DefaultHistoryEventHandler";
import { createReturnEventHandlers } from "./ReturnEventHandlers";
import type { HistoryEventHandler } from "./types";
import { createUserEventHandlers } from "./UserEventHandlers";

export class HistoryEventRegistry {
  constructor(private readonly handlers: HistoryEventHandler[]) {}

  resolve(log: AuditLogRecord): HistoryEvent | null {
    for (const handler of this.handlers) {
      if (handler.canHandle(log.action)) {
        return handler.toEvent(log);
      }
    }

    return null;
  }
}

export function createDefaultHistoryEventRegistry() {
  return new HistoryEventRegistry([
    ...createBorrowRequestEventHandlers(),
    ...createReturnEventHandlers(),
    ...createAssetEventHandlers(),
    ...createUserEventHandlers(),
    new DefaultHistoryEventHandler(),
  ]);
}
