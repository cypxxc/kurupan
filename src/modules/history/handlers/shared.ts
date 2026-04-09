import type { AuditLogRecord } from "@/modules/audit/repositories/AuditLogRepository";
import type { HistoryEvent } from "@/types/history";

type BorrowRequestSnapshot = {
  id?: number;
  requestNo?: string;
  borrowerExternalUserId?: string;
  borrowerName?: string;
  items?: Array<unknown>;
};

type ReturnAuditPayload = {
  returnTransaction?: {
    id?: number;
    borrowRequestNo?: string;
    items?: Array<{ returnQty?: number }>;
  };
  borrowRequest?: {
    borrowerExternalUserId?: string;
    borrowerName?: string;
    requestNo?: string;
  };
};

type AssetSnapshot = {
  assetCode?: string;
  name?: string;
};

type UserSnapshot = {
  fullName?: string;
  externalUserId?: string;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getEntitySnapshot<T>(
  log: AuditLogRecord,
  entityType: AuditLogRecord["entityType"],
) {
  if (log.entityType !== entityType) {
    return null;
  }

  const afterData = asObject(log.afterData);
  const beforeData = asObject(log.beforeData);

  return (afterData ?? beforeData) as T | null;
}

export function getBorrowRequestSnapshot(log: AuditLogRecord) {
  return getEntitySnapshot<BorrowRequestSnapshot>(log, "borrow_request");
}

export function getReturnPayload(log: AuditLogRecord) {
  return getEntitySnapshot<ReturnAuditPayload>(log, "return_transaction");
}

export function getAssetSnapshot(log: AuditLogRecord) {
  return getEntitySnapshot<AssetSnapshot>(log, "asset");
}

export function getUserSnapshot(log: AuditLogRecord) {
  return getEntitySnapshot<UserSnapshot>(log, "user");
}

export function getFallbackActor(log: AuditLogRecord) {
  return log.actorName ?? log.actorExternalUserId ?? "ระบบ";
}

export function createHistoryEvent(
  log: AuditLogRecord,
  overrides: Pick<HistoryEvent, "entityType" | "reference" | "summary">,
): HistoryEvent {
  return {
    id: log.id,
    occurredAt: log.createdAt.toISOString(),
    entityType: overrides.entityType,
    action: log.action,
    actorExternalUserId: log.actorExternalUserId ?? null,
    actorName: log.actorName ?? null,
    entityId: log.entityId,
    reference: overrides.reference,
    summary: overrides.summary,
  };
}
