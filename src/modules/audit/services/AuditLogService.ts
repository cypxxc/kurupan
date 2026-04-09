import { AuthorizationError } from "@/lib/errors";
import type { AuditLogListQuery } from "@/lib/validators/history";
import type { ActorContext } from "@/types/auth";
import type { AuditLogEntry } from "@/types/history";

import { AuditLogRepository } from "../repositories/AuditLogRepository";

export class AuditLogService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async record(input: {
    actor?: ActorContext | null;
    action: string;
    entityType: string;
    entityId: string | number;
    beforeData?: unknown;
    afterData?: unknown;
  }) {
    return this.auditLogRepository.create({
      actorExternalUserId: input.actor?.externalUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: String(input.entityId),
      beforeData: input.beforeData,
      afterData: input.afterData,
    });
  }

  async listAuditLogs(actor: ActorContext, filters: AuditLogListQuery): Promise<AuditLogEntry[]> {
    if (actor.role === "borrower") {
      throw new AuthorizationError("คุณไม่มีสิทธิ์ดูบันทึกตรวจสอบ");
    }

    const rows = await this.auditLogRepository.findMany(filters);

    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      actorExternalUserId: row.actorExternalUserId ?? null,
      actorName: row.actorName ?? null,
      action: row.action,
      entityType: row.entityType as AuditLogEntry["entityType"],
      entityId: row.entityId,
      hasBeforeData: row.beforeData !== null,
      hasAfterData: row.afterData !== null,
    }));
  }
}
