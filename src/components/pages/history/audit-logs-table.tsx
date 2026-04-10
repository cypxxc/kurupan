"use client";

import { HistoryEmptyState } from "@/components/pages/history/history-empty-state";
import { formatHistoryDateTime } from "@/components/pages/history/history-helpers";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/components/providers/i18n-provider";
import { cn } from "@/lib/utils";
import type { AuditLogEntry } from "@/types/history";

type AuditLogsTableProps = {
  items: AuditLogEntry[];
  loading: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function AuditLogsTable({
  items,
  loading,
  page,
  limit,
  total,
  totalPages,
  onPageChange,
}: AuditLogsTableProps) {
  const { t } = useI18n();
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = total === 0 ? 0 : Math.min(page * limit, total);

  return (
    <section className="table-shell">
      <div className="border-b px-6 py-5">
        <h2 className="text-lg font-semibold">{t("history.audit.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("history.audit.description")}</p>
      </div>
      {loading ? (
        <div className="space-y-3 px-6 py-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-sm border border-border/80 bg-muted/55"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <HistoryEmptyState
          title={t("history.audit.emptyTitle")}
          description={t("history.audit.emptyDescription")}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("history.audit.headers.when")}</TableHead>
                  <TableHead>{t("history.audit.headers.entity")}</TableHead>
                  <TableHead>{t("history.audit.headers.action")}</TableHead>
                  <TableHead>{t("history.audit.headers.entityId")}</TableHead>
                  <TableHead>{t("history.audit.headers.actor")}</TableHead>
                  <TableHead>{t("history.audit.headers.capturedData")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatHistoryDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell>{log.entityType}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.entityId}</TableCell>
                    <TableCell>
                      {log.actorName ?? log.actorExternalUserId ?? t("history.audit.systemActor")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "pointer-events-none h-7 px-2 text-xs",
                          )}
                        >
                          {t("history.audit.before", {
                            value: log.hasBeforeData ? t("history.audit.yes") : t("history.audit.no"),
                          })}
                        </span>
                        <span
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "pointer-events-none h-7 px-2 text-xs",
                          )}
                        >
                          {t("history.audit.after", {
                            value: log.hasAfterData ? t("history.audit.yes") : t("history.audit.no"),
                          })}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">
              {t("history.audit.summary", {
                start: startItem,
                end: endItem,
                total,
              })}
            </p>
            <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
          </div>
        </>
      )}
    </section>
  );
}
