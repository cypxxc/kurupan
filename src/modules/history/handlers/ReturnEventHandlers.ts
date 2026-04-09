import type { AuditLogRecord } from "@/modules/audit/repositories/AuditLogRepository";

import {
  createHistoryEvent,
  getFallbackActor,
  getReturnPayload,
} from "./shared";
import type { HistoryEventHandler } from "./types";

abstract class ReturnEventHandler implements HistoryEventHandler {
  protected abstract readonly action: string;

  canHandle(action: string): boolean {
    return action === this.action;
  }

  abstract toEvent(log: AuditLogRecord): ReturnType<HistoryEventHandler["toEvent"]>;
}

class ReturnCreatedHandler extends ReturnEventHandler {
  protected readonly action = "return.create";

  toEvent(log: AuditLogRecord) {
    const returnPayload = getReturnPayload(log);
    const totalReturned =
      returnPayload?.returnTransaction?.items?.reduce((sum, item) => {
        return sum + Number(item.returnQty ?? 0);
      }, 0) ?? 0;

    return createHistoryEvent(log, {
      entityType: "return_transaction",
      reference:
        returnPayload?.borrowRequest?.requestNo ??
        returnPayload?.returnTransaction?.borrowRequestNo ??
        `รายการคืน #${log.entityId}`,
      summary: `${getFallbackActor(log)} บันทึกการคืน ${totalReturned} หน่วย`,
    });
  }
}

class ReturnUpdatedHandler extends ReturnEventHandler {
  protected readonly action = "return.update";

  toEvent(log: AuditLogRecord) {
    return createHistoryEvent(log, {
      entityType: "return_transaction",
      reference: `รายการคืน #${log.entityId}`,
      summary: `${getFallbackActor(log)} แก้ไขบันทึกการคืน`,
    });
  }
}

export function createReturnEventHandlers(): HistoryEventHandler[] {
  return [new ReturnCreatedHandler(), new ReturnUpdatedHandler()];
}
