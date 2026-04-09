import type { AuditLogRecord } from "@/modules/audit/repositories/AuditLogRepository";

import { createHistoryEvent, getUserSnapshot } from "./shared";
import type { HistoryEventHandler } from "./types";

abstract class UserEventHandler implements HistoryEventHandler {
  protected abstract readonly action: string;

  canHandle(action: string): boolean {
    return action === this.action;
  }

  abstract toEvent(log: AuditLogRecord): ReturnType<HistoryEventHandler["toEvent"]>;
}

class UserCreatedHandler extends UserEventHandler {
  protected readonly action = "user.create";

  toEvent(log: AuditLogRecord) {
    const user = getUserSnapshot(log);

    return createHistoryEvent(log, {
      entityType: "user",
      reference: user?.externalUserId ?? `ผู้ใช้ #${log.entityId}`,
      summary: `สร้างผู้ใช้ ${user?.fullName ?? ""}`.trim(),
    });
  }
}

class UserUpdatedHandler extends UserEventHandler {
  protected readonly action = "user.update";

  toEvent(log: AuditLogRecord) {
    const user = getUserSnapshot(log);

    return createHistoryEvent(log, {
      entityType: "user",
      reference: user?.externalUserId ?? `ผู้ใช้ #${log.entityId}`,
      summary: `อัปเดตผู้ใช้ ${user?.fullName ?? ""}`.trim(),
    });
  }
}

export function createUserEventHandlers(): HistoryEventHandler[] {
  return [new UserCreatedHandler(), new UserUpdatedHandler()];
}
