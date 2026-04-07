import type { HistoryListQuery } from "@/lib/validators/history";
import type { ActorContext } from "@/types/auth";
import type { HistoryEvent } from "@/types/history";

import type { AuditLogRecord } from "@/modules/audit/repositories/AuditLogRepository";

import { AuditLogRepository } from "../../audit/repositories/AuditLogRepository";

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

function getBorrowRequestSnapshot(log: AuditLogRecord): BorrowRequestSnapshot | null {
  const afterData = asObject(log.afterData);
  const beforeData = asObject(log.beforeData);

  if (log.entityType !== "borrow_request") {
    return null;
  }

  return (afterData ?? beforeData) as BorrowRequestSnapshot | null;
}

function getReturnPayload(log: AuditLogRecord): ReturnAuditPayload | null {
  const afterData = asObject(log.afterData);
  const beforeData = asObject(log.beforeData);

  if (log.entityType !== "return_transaction") {
    return null;
  }

  return (afterData ?? beforeData) as ReturnAuditPayload | null;
}

function getAssetSnapshot(log: AuditLogRecord): AssetSnapshot | null {
  const afterData = asObject(log.afterData);
  const beforeData = asObject(log.beforeData);

  if (log.entityType !== "asset") {
    return null;
  }

  return (afterData ?? beforeData) as AssetSnapshot | null;
}

function getUserSnapshot(log: AuditLogRecord): UserSnapshot | null {
  const afterData = asObject(log.afterData);
  const beforeData = asObject(log.beforeData);

  if (log.entityType !== "user") {
    return null;
  }

  return (afterData ?? beforeData) as UserSnapshot | null;
}

function logBelongsToBorrower(log: AuditLogRecord, externalUserId: string) {
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

function toHistoryEvent(log: AuditLogRecord): HistoryEvent {
  const fallbackActor = log.actorName ?? log.actorExternalUserId ?? "system";
  const borrowRequest = getBorrowRequestSnapshot(log);
  const returnPayload = getReturnPayload(log);
  const asset = getAssetSnapshot(log);
  const user = getUserSnapshot(log);

  switch (log.action) {
    case "borrow_request.create":
      return {
        id: log.id,
        occurredAt: log.createdAt.toISOString(),
        entityType: "borrow_request",
        action: log.action,
        actorExternalUserId: log.actorExternalUserId ?? null,
        actorName: log.actorName ?? null,
        entityId: log.entityId,
        reference: borrowRequest?.requestNo ?? `Borrow Request #${log.entityId}`,
        summary: `ส่งคำขอยืม ${(borrowRequest?.items?.length ?? 0) || 0} รายการ`,
      };
    case "borrow_request.approve":
      return {
        id: log.id,
        occurredAt: log.createdAt.toISOString(),
        entityType: "borrow_request",
        action: log.action,
        actorExternalUserId: log.actorExternalUserId ?? null,
        actorName: log.actorName ?? null,
        entityId: log.entityId,
        reference: borrowRequest?.requestNo ?? `Borrow Request #${log.entityId}`,
        summary: `${fallbackActor} อนุมัติคำขอยืม`,
      };
    case "borrow_request.reject":
      return {
        id: log.id,
        occurredAt: log.createdAt.toISOString(),
        entityType: "borrow_request",
        action: log.action,
        actorExternalUserId: log.actorExternalUserId ?? null,
        actorName: log.actorName ?? null,
        entityId: log.entityId,
        reference: borrowRequest?.requestNo ?? `Borrow Request #${log.entityId}`,
        summary: `${fallbackActor} ปฏิเสธคำขอยืม`,
      };
    case "borrow_request.cancel":
      return {
        id: log.id,
        occurredAt: log.createdAt.toISOString(),
        entityType: "borrow_request",
        action: log.action,
        actorExternalUserId: log.actorExternalUserId ?? null,
        actorName: log.actorName ?? null,
        entityId: log.entityId,
        reference: borrowRequest?.requestNo ?? `Borrow Request #${log.entityId}`,
        summary: `${fallbackActor} ยกเลิกคำขอยืม`,
      };
    case "return.create": {
      const totalReturned =
        returnPayload?.returnTransaction?.items?.reduce((sum, item) => {
          return sum + Number(item.returnQty ?? 0);
        }, 0) ?? 0;

      return {
        id: log.id,
        occurredAt: log.createdAt.toISOString(),
        entityType: "return_transaction",
        action: log.action,
        actorExternalUserId: log.actorExternalUserId ?? null,
        actorName: log.actorName ?? null,
        entityId: log.entityId,
        reference:
          returnPayload?.borrowRequest?.requestNo ??
          returnPayload?.returnTransaction?.borrowRequestNo ??
          `Return #${log.entityId}`,
        summary: `${fallbackActor} บันทึกการคืน ${totalReturned} หน่วย`,
      };
    }
    case "return.update":
      return {
        id: log.id,
        occurredAt: log.createdAt.toISOString(),
        entityType: "return_transaction",
        action: log.action,
        actorExternalUserId: log.actorExternalUserId ?? null,
        actorName: log.actorName ?? null,
        entityId: log.entityId,
        reference: `Return #${log.entityId}`,
        summary: `${fallbackActor} แก้ไขบันทึกการคืน`,
      };
    case "asset.create":
      return {
        id: log.id,
        occurredAt: log.createdAt.toISOString(),
        entityType: "asset",
        action: log.action,
        actorExternalUserId: log.actorExternalUserId ?? null,
        actorName: log.actorName ?? null,
        entityId: log.entityId,
        reference: asset?.assetCode ?? `Asset #${log.entityId}`,
        summary: `เพิ่มครุภัณฑ์ ${asset?.name ?? ""}`.trim(),
      };
    case "asset.update":
      return {
        id: log.id,
        occurredAt: log.createdAt.toISOString(),
        entityType: "asset",
        action: log.action,
        actorExternalUserId: log.actorExternalUserId ?? null,
        actorName: log.actorName ?? null,
        entityId: log.entityId,
        reference: asset?.assetCode ?? `Asset #${log.entityId}`,
        summary: `อัปเดตครุภัณฑ์ ${asset?.name ?? ""}`.trim(),
      };
    case "user.create":
      return {
        id: log.id,
        occurredAt: log.createdAt.toISOString(),
        entityType: "user",
        action: log.action,
        actorExternalUserId: log.actorExternalUserId ?? null,
        actorName: log.actorName ?? null,
        entityId: log.entityId,
        reference: user?.externalUserId ?? `User #${log.entityId}`,
        summary: `สร้างผู้ใช้ ${user?.fullName ?? ""}`.trim(),
      };
    case "user.update":
      return {
        id: log.id,
        occurredAt: log.createdAt.toISOString(),
        entityType: "user",
        action: log.action,
        actorExternalUserId: log.actorExternalUserId ?? null,
        actorName: log.actorName ?? null,
        entityId: log.entityId,
        reference: user?.externalUserId ?? `User #${log.entityId}`,
        summary: `อัปเดตผู้ใช้ ${user?.fullName ?? ""}`.trim(),
      };
    default:
      return {
        id: log.id,
        occurredAt: log.createdAt.toISOString(),
        entityType: log.entityType as HistoryEvent["entityType"],
        action: log.action,
        actorExternalUserId: log.actorExternalUserId ?? null,
        actorName: log.actorName ?? null,
        entityId: log.entityId,
        reference: `${log.entityType} #${log.entityId}`,
        summary: log.action,
      };
  }
}

export class HistoryService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async listHistory(actor: ActorContext, filters: HistoryListQuery): Promise<HistoryEvent[]> {
    const logs = await this.auditLogRepository.findMany(filters);

    const visibleLogs =
      actor.role === "borrower"
        ? logs.filter((log) => logBelongsToBorrower(log, actor.externalUserId))
        : logs;

    return visibleLogs.map(toHistoryEvent);
  }
}
