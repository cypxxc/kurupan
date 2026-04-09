import type { AuditLogRecord } from "@/modules/audit/repositories/AuditLogRepository";

import {
  createHistoryEvent,
  getBorrowRequestSnapshot,
  getFallbackActor,
} from "./shared";
import type { HistoryEventHandler } from "./types";

abstract class BorrowRequestEventHandler implements HistoryEventHandler {
  protected abstract readonly action: string;

  canHandle(action: string): boolean {
    return action === this.action;
  }

  abstract toEvent(log: AuditLogRecord): ReturnType<HistoryEventHandler["toEvent"]>;
}

class BorrowRequestCreatedHandler extends BorrowRequestEventHandler {
  protected readonly action = "borrow_request.create";

  toEvent(log: AuditLogRecord) {
    const borrowRequest = getBorrowRequestSnapshot(log);

    return createHistoryEvent(log, {
      entityType: "borrow_request",
      reference: borrowRequest?.requestNo ?? `คำขอยืม #${log.entityId}`,
      summary: `ส่งคำขอยืม ${borrowRequest?.items?.length ?? 0} รายการ`,
    });
  }
}

class BorrowRequestApprovedHandler extends BorrowRequestEventHandler {
  protected readonly action = "borrow_request.approve";

  toEvent(log: AuditLogRecord) {
    const borrowRequest = getBorrowRequestSnapshot(log);

    return createHistoryEvent(log, {
      entityType: "borrow_request",
      reference: borrowRequest?.requestNo ?? `คำขอยืม #${log.entityId}`,
      summary: `${getFallbackActor(log)} อนุมัติคำขอยืม`,
    });
  }
}

class BorrowRequestRejectedHandler extends BorrowRequestEventHandler {
  protected readonly action = "borrow_request.reject";

  toEvent(log: AuditLogRecord) {
    const borrowRequest = getBorrowRequestSnapshot(log);

    return createHistoryEvent(log, {
      entityType: "borrow_request",
      reference: borrowRequest?.requestNo ?? `คำขอยืม #${log.entityId}`,
      summary: `${getFallbackActor(log)} ปฏิเสธคำขอยืม`,
    });
  }
}

class BorrowRequestCancelledHandler extends BorrowRequestEventHandler {
  protected readonly action = "borrow_request.cancel";

  toEvent(log: AuditLogRecord) {
    const borrowRequest = getBorrowRequestSnapshot(log);

    return createHistoryEvent(log, {
      entityType: "borrow_request",
      reference: borrowRequest?.requestNo ?? `คำขอยืม #${log.entityId}`,
      summary: `${getFallbackActor(log)} ยกเลิกคำขอยืม`,
    });
  }
}

export function createBorrowRequestEventHandlers(): HistoryEventHandler[] {
  return [
    new BorrowRequestCreatedHandler(),
    new BorrowRequestApprovedHandler(),
    new BorrowRequestRejectedHandler(),
    new BorrowRequestCancelledHandler(),
  ];
}
