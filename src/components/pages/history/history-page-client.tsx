"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { AuditLogsTable } from "@/components/pages/history/audit-logs-table";
import {
  ACTION_OPTIONS,
  ENTITY_OPTIONS,
  type ViewMode,
} from "@/components/pages/history/history-constants";
import { HistoryEventsTable } from "@/components/pages/history/history-events-table";
import { HistoryFilterPanel } from "@/components/pages/history/history-filter-panel";
import { useAuth } from "@/lib/auth-context";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AuditLogEntry, HistoryEntityType, HistoryEvent } from "@/types/history";

export function HistoryPageClient() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("history");
  const [entityType, setEntityType] = useState<"all" | HistoryEntityType>("all");
  const [action, setAction] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [historyItems, setHistoryItems] = useState<HistoryEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(true);

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

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);

    try {
      const response = await fetch(`/api/history?${queryString}`);
      const result = (await response.json()) as
        | { success: true; data: HistoryEvent[] }
        | { success: false; error?: { message?: string } };

      if (!result.success) {
        toast.error(result.error?.message ?? "Unable to load history.");
        setHistoryItems([]);
        return;
      }

      setHistoryItems(result.data);
    } catch {
      toast.error("An error occurred while loading history.");
      setHistoryItems([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [queryString]);

  const fetchAuditLogs = useCallback(async () => {
    if (!canManageAudit) {
      setLoadingAudit(false);
      setAuditLogs([]);
      return;
    }

    setLoadingAudit(true);

    try {
      const response = await fetch(`/api/audit-logs?${queryString}`);
      const result = (await response.json()) as
        | { success: true; data: AuditLogEntry[] }
        | { success: false; error?: { message?: string } };

      if (!result.success) {
        toast.error(result.error?.message ?? "Unable to load audit logs.");
        setAuditLogs([]);
        return;
      }

      setAuditLogs(result.data);
    } catch {
      toast.error("An error occurred while loading audit logs.");
      setAuditLogs([]);
    } finally {
      setLoadingAudit(false);
    }
  }, [canManageAudit, queryString]);

  useEffect(() => {
    void fetchHistory();
    void fetchAuditLogs();
  }, [fetchAuditLogs, fetchHistory]);

  const visibleEntityOptions = useMemo(() => {
    if (canManageAudit) {
      return ENTITY_OPTIONS;
    }

    return ENTITY_OPTIONS.filter(
      (option) =>
        option.value === "all" ||
        option.value === "borrow_request" ||
        option.value === "return_transaction",
    );
  }, [canManageAudit]);

  const visibleActionOptions = useMemo(() => {
    if (canManageAudit) {
      return ACTION_OPTIONS;
    }

    return ACTION_OPTIONS.filter(
      (option) =>
        option.value === "all" ||
        option.value.startsWith("borrow_request.") ||
        option.value.startsWith("return."),
    );
  }, [canManageAudit]);

  if (!user) {
    return (
      <div className="empty-state">
        <div className="mx-auto flex size-14 items-center justify-center rounded-sm border border-border bg-muted/55 text-muted-foreground">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Unable to load user session</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">History and Audit</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Activity history</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {canManageAudit
                ? "Review system activity and audit logs for administrative changes."
                : "Review your borrow and return activity history."}
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
              History
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
              Audit logs
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
          title={canManageAudit ? "System events" : "My history"}
          description="Events visible to the current user under the selected filters."
          items={historyItems}
          loading={loadingHistory}
        />
      ) : null}

      {canManageAudit && viewMode === "audit" ? (
        <AuditLogsTable items={auditLogs} loading={loadingAudit} />
      ) : null}
    </div>
  );
}
