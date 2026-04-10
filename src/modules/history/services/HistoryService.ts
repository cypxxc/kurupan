import {
  buildPaginatedResult,
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
import { logBelongsToBorrower } from "./history-service.helpers";

export class HistoryService {
  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly historyEventRegistry: HistoryEventRegistry = createDefaultHistoryEventRegistry(),
  ) {}

  async listHistory(actor: ActorContext, filters: HistoryListQuery): Promise<HistoryEvent[]> {
    const logs = await this.auditLogRepository.findMany(filters);
    const visibleLogs =
      actor.role === "borrower"
        ? logs.filter((log) => logBelongsToBorrower(log, actor.externalUserId))
        : logs;

    return visibleLogs
      .map((log) => this.historyEventRegistry.resolve(log))
      .filter((event): event is HistoryEvent => Boolean(event));
  }

  async listHistoryPage(
    actor: ActorContext,
    filters: HistoryListQuery,
  ): Promise<PaginatedResult<HistoryEvent>> {
    const pagination = resolvePagination(filters, 20);

    if (actor.role !== "borrower") {
      const page = await this.auditLogRepository.findPage(filters, pagination.limit);

      return {
        ...page,
        items: page.items
          .map((log) => this.historyEventRegistry.resolve(log))
          .filter((event): event is HistoryEvent => Boolean(event)),
      };
    }

    const events = await this.listHistory(actor, filters);
    const items = events.slice(pagination.offset, pagination.offset + pagination.limit);

    return buildPaginatedResult(items, events.length, pagination);
  }
}
