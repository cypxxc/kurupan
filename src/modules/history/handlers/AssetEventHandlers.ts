import type { AuditLogRecord } from "@/modules/audit/repositories/AuditLogRepository";

import { createHistoryEvent, getAssetSnapshot } from "./shared";
import type { HistoryEventHandler } from "./types";

abstract class AssetEventHandler implements HistoryEventHandler {
  protected abstract readonly action: string;

  canHandle(action: string): boolean {
    return action === this.action;
  }

  abstract toEvent(log: AuditLogRecord): ReturnType<HistoryEventHandler["toEvent"]>;
}

class AssetCreatedHandler extends AssetEventHandler {
  protected readonly action = "asset.create";

  toEvent(log: AuditLogRecord) {
    const asset = getAssetSnapshot(log);

    return createHistoryEvent(log, {
      entityType: "asset",
      reference: asset?.assetCode ?? `ครุภัณฑ์ #${log.entityId}`,
      summary: `เพิ่มครุภัณฑ์ ${asset?.name ?? ""}`.trim(),
    });
  }
}

class AssetUpdatedHandler extends AssetEventHandler {
  protected readonly action = "asset.update";

  toEvent(log: AuditLogRecord) {
    const asset = getAssetSnapshot(log);

    return createHistoryEvent(log, {
      entityType: "asset",
      reference: asset?.assetCode ?? `ครุภัณฑ์ #${log.entityId}`,
      summary: `อัปเดตครุภัณฑ์ ${asset?.name ?? ""}`.trim(),
    });
  }
}

class AssetDeletedHandler extends AssetEventHandler {
  protected readonly action = "asset.delete";

  toEvent(log: AuditLogRecord) {
    const asset = getAssetSnapshot(log);

    return createHistoryEvent(log, {
      entityType: "asset",
      reference: asset?.assetCode ?? `Asset #${log.entityId}`,
      summary: `Delete asset ${asset?.name ?? ""}`.trim(),
    });
  }
}

export function createAssetEventHandlers(): HistoryEventHandler[] {
  return [new AssetCreatedHandler(), new AssetUpdatedHandler(), new AssetDeletedHandler()];
}
