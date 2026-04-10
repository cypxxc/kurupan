import {
  resolvePagination,
  type PaginatedResult,
} from "@/lib/pagination";
import type { HistoryListQuery } from "@/lib/validators/history";
import type { ActorContext } from "@/types/auth";
import type { HistoryEvent } from "@/types/history";

import { AuditLogRepository } from "../../audit/repositories/AuditLogRepository";
import {
  HistoryEventRegistry,
  createDefaultHistoryEventRegistry,
} from "../handlers";

export class HistoryService {
  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly historyEventRegistry: HistoryEventRegistry = createDefaultHistoryEventRegistry(),
  ) {}

  async listHistory(actor: ActorContext, filters: HistoryListQuery): Promise<HistoryEvent[]> {
    const actorExternalUserId =
      actor.role === "borrower" ? actor.externalUserId : undefined;
    const logs = await this.auditLogRepository.findMany(filters, actorExternalUserId);

    return logs
      .map((log) => this.historyEventRegistry.resolve(log))
      .filter((event): event is HistoryEvent => Boolean(event));
  }

  async listHistoryPage(
    actor: ActorContext,
    filters: HistoryListQuery,
  ): Promise<PaginatedResult<HistoryEvent>> {
    const pagination = resolvePagination(filters, 20);
    const actorExternalUserId =
      actor.role === "borrower" ? actor.externalUserId : undefined;
    const page = await this.auditLogRepository.findPage(
      filters,
      pagination.limit,
      actorExternalUserId,
    );

    return {
      ...page,
      items: page.items
        .map((log) => this.historyEventRegistry.resolve(log))
        .filter((event): event is HistoryEvent => Boolean(event)),
    };
  }
}
