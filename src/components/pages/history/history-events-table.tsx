"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HistoryEmptyState } from "@/components/pages/history/history-empty-state";
import { formatHistoryDateTime } from "@/components/pages/history/history-helpers";
import {
  getHistoryActionLabelKey,
  getHistoryEntityLabelKey,
} from "@/components/pages/history/history-constants";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { useI18n } from "@/components/providers/i18n-provider";
import type { HistoryEvent } from "@/types/history";

type HistoryEventsTableProps = {
  title: string;
  description: string;
  items: HistoryEvent[];
  loading: boolean;
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
};

export function HistoryEventsTable({
  title,
  description,
  items,
  loading,
  page,
  limit,
  total,
  totalPages,
  onPageChange,
}: HistoryEventsTableProps) {
  const { t } = useI18n();
  const showPagination =
    page !== undefined &&
    limit !== undefined &&
    total !== undefined &&
    totalPages !== undefined &&
    onPageChange !== undefined;
  const startItem = showPagination && total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = showPagination && total > 0 ? Math.min(page * limit, total) : 0;

  return (
    <section className="table-shell">
      <div className="border-b px-6 py-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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
          title={t("history.events.emptyTitle")}
          description={t("history.events.emptyDescription")}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("history.events.headers.when")}</TableHead>
                  <TableHead>{t("history.events.headers.entity")}</TableHead>
                  <TableHead>{t("history.events.headers.action")}</TableHead>
                  <TableHead>{t("history.events.headers.reference")}</TableHead>
                  <TableHead>{t("history.events.headers.actor")}</TableHead>
                  <TableHead>{t("history.events.headers.summary")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatHistoryDateTime(item.occurredAt)}
                    </TableCell>
                    <TableCell>{t(getHistoryEntityLabelKey(item.entityType))}</TableCell>
                    <TableCell>{t(getHistoryActionLabelKey(item.action))}</TableCell>
                    <TableCell className="font-medium">{item.reference}</TableCell>
                    <TableCell>
                      {item.actorName ?? item.actorExternalUserId ?? t("history.events.systemActor")}
                    </TableCell>
                    <TableCell className="min-w-72">{item.summary}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {showPagination ? (
            <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground">
                {t("history.events.summary", {
                  start: startItem,
                  end: endItem,
                  total,
                })}
              </p>
              <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
