"use client";

import { ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { AuditLogsTable } from "@/components/pages/history/audit-logs-table";
import {
  ACTION_OPTION_VALUES,
  ENTITY_OPTION_VALUES,
  getHistoryActionLabelKey,
  getHistoryEntityLabelKey,
  type ViewMode,
} from "@/components/pages/history/history-constants";
import { HistoryEventsTable } from "@/components/pages/history/history-events-table";
import { HistoryFilterPanel } from "@/components/pages/history/history-filter-panel";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { PaginatedResult } from "@/lib/pagination";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AuditLogEntry, HistoryEntityType, HistoryEvent } from "@/types/history";

const HISTORY_PAGE_SIZE = 20;
const AUDIT_LOG_PAGE_SIZE = 20;

type HistoryPageClientProps = {
  initialHistoryPage: PaginatedResult<HistoryEvent>;
};

function createEmptyAuditPagination(page = 1): PaginatedResult<AuditLogEntry> {
  return {
    items: [],
    page,
    limit: AUDIT_LOG_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  };
}

export function HistoryPageClient({ initialHistoryPage }: HistoryPageClientProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("history");
  const [entityType, setEntityType] = useState<"all" | HistoryEntityType>("all");
  const [action, setAction] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [historyItems, setHistoryItems] = useState<HistoryEvent[]>(initialHistoryPage.items);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [historyPage, setHistoryPage] = useState(initialHistoryPage.page);
  const [auditPage, setAuditPage] = useState(1);
  const [historyPagination, setHistoryPagination] =
    useState<PaginatedResult<HistoryEvent>>(initialHistoryPage);
  const [auditPagination, setAuditPagination] =
    useState<PaginatedResult<AuditLogEntry>>(createEmptyAuditPagination());
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const hasFetchedHistoryRef = useRef(false);
  const hasFetchedAuditRef = useRef(false);

  const canManageAudit = user?.role === "staff" || user?.role === "admin";

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (entityType !== "all") {
      params.set("entityType", entityType);
    }

    if (action !== "all") {
      params.set("action", action);
    }

    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    }

    return params.toString();
  }, [action, dateFrom, dateTo, entityType]);

  useEffect(() => {
    setHistoryPage(1);
    setAuditPage(1);
  }, [queryString]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);

    try {
      const historyQuery = new URLSearchParams(queryString);
      historyQuery.set("page", String(historyPage));
      historyQuery.set("limit", String(HISTORY_PAGE_SIZE));

      const data = await apiClient.get<PaginatedResult<HistoryEvent>>("/api/history", {
        query: historyQuery,
      });

      hasFetchedHistoryRef.current = true;
      setHistoryItems(data.items);
      setHistoryPagination(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("history.loadHistoryError")));
      setHistoryItems([]);
      setHistoryPagination({
        items: [],
        page: historyPage,
        limit: HISTORY_PAGE_SIZE,
        total: 0,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      });
    } finally {
      setLoadingHistory(false);
    }
  }, [historyPage, queryString, t]);

  const fetchAuditLogs = useCallback(async () => {
    if (!canManageAudit) {
      setLoadingAudit(false);
      setAuditLogs([]);
      setAuditPagination(createEmptyAuditPagination(auditPage));
      return;
    }

    setLoadingAudit(true);

    try {
      const auditQuery = new URLSearchParams(queryString);
      auditQuery.set("page", String(auditPage));
      auditQuery.set("limit", String(AUDIT_LOG_PAGE_SIZE));

      const data = await apiClient.get<PaginatedResult<AuditLogEntry>>("/api/audit-logs", {
        query: auditQuery,
      });

      hasFetchedAuditRef.current = true;
      setAuditLogs(data.items);
      setAuditPagination(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("history.loadAuditError")));
      setAuditLogs([]);
      setAuditPagination(createEmptyAuditPagination(auditPage));
    } finally {
      setLoadingAudit(false);
    }
  }, [auditPage, canManageAudit, queryString, t]);

  useEffect(() => {
    if (!hasFetchedHistoryRef.current) {
      hasFetchedHistoryRef.current = true;
      return;
    }

    void fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!canManageAudit || viewMode !== "audit") {
      return;
    }

    void fetchAuditLogs();
  }, [canManageAudit, fetchAuditLogs, viewMode]);

  const entityOptions = useMemo(
    () =>
      ENTITY_OPTION_VALUES.map((value) => ({
        value,
        label: t(getHistoryEntityLabelKey(value)),
      })),
    [t],
  );

  const actionOptions = useMemo(
    () =>
      ACTION_OPTION_VALUES.map((value) => ({
        value,
        label: t(getHistoryActionLabelKey(value)),
      })),
    [t],
  );

  const visibleEntityOptions = useMemo(() => {
    if (canManageAudit) {
      return entityOptions;
    }

    return entityOptions.filter(
      (option) =>
        option.value === "all" ||
        option.value === "borrow_request" ||
        option.value === "return_transaction",
    );
  }, [canManageAudit, entityOptions]);

  const visibleActionOptions = useMemo(() => {
    if (canManageAudit) {
      return actionOptions;
    }

    return actionOptions.filter(
      (option) =>
        option.value === "all" ||
        option.value.startsWith("borrow_request.") ||
        option.value.startsWith("return."),
    );
  }, [actionOptions, canManageAudit]);

  if (!user) {
    return (
      <div className="empty-state">
        <div className="mx-auto flex size-14 items-center justify-center rounded-sm border border-border bg-muted/55 text-muted-foreground">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">{t("history.sessionError")}</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{t("history.eyebrow")}</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{t("history.title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {canManageAudit ? t("history.descriptionAdmin") : t("history.descriptionBorrower")}
            </p>
          </div>
        </div>

        {canManageAudit ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cn(
                buttonVariants({
                  variant: viewMode === "history" ? "default" : "outline",
                  size: "sm",
                }),
              )}
              onClick={() => setViewMode("history")}
            >
              {t("history.tabs.history")}
            </button>
            <button
              type="button"
              className={cn(
                buttonVariants({
                  variant: viewMode === "audit" ? "default" : "outline",
                  size: "sm",
                }),
              )}
              onClick={() => setViewMode("audit")}
            >
              {t("history.tabs.audit")}
            </button>
          </div>
        ) : null}
      </div>

      <HistoryFilterPanel
        entityType={entityType}
        action={action}
        dateFrom={dateFrom}
        dateTo={dateTo}
        entityOptions={visibleEntityOptions}
        actionOptions={visibleActionOptions}
        onEntityTypeChange={setEntityType}
        onActionChange={setAction}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      {viewMode === "history" || !canManageAudit ? (
        <HistoryEventsTable
          title={canManageAudit ? t("history.events.systemTitle") : t("history.events.myTitle")}
          description={t("history.events.description")}
          items={historyItems}
          loading={loadingHistory}
          page={historyPagination.page}
          limit={historyPagination.limit}
          total={historyPagination.total}
          totalPages={historyPagination.totalPages}
          onPageChange={setHistoryPage}
        />
      ) : null}

      {canManageAudit && viewMode === "audit" ? (
        <AuditLogsTable
          items={auditLogs}
          loading={loadingAudit}
          page={auditPagination.page}
          limit={auditPagination.limit}
          total={auditPagination.total}
          totalPages={auditPagination.totalPages}
          onPageChange={setAuditPage}
        />
      ) : null}
    </div>
  );
}
