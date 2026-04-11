"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Hash, PencilLine, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { AssetCodeSeries } from "@/types/asset-code-series";

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getPreviewCode(series: AssetCodeSeries) {
  return `${series.prefix}${series.separator}${String(series.counter + 1).padStart(series.padLength, "0")}`;
}

function getPatternExample(series: AssetCodeSeries) {
  return `${series.prefix}${series.separator}${"0".repeat(series.padLength)}`;
}

export function AssetCodeSeriesTable({
  series,
  loading,
  onDeleted,
}: {
  series: AssetCodeSeries[];
  loading: boolean;
  onDeleted: (id: number) => void;
}) {
  const { t } = useI18n();
  const [pendingDelete, setPendingDelete] = useState<AssetCodeSeries | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const latestUpdatedAt = useMemo(() => {
    return [...series].sort(
      (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    )[0]?.updatedAt;
  }, [series]);

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    setDeletingId(pendingDelete.id);

    try {
      await apiClient.delete<never>(`/api/asset-code-series/${pendingDelete.id}`, {
        parseAs: "void",
      });

      toast.success(t("assetCodeSeries.table.deleted"));
      onDeleted(pendingDelete.id);
      setPendingDelete(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("assetCodeSeries.table.deleteError")));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="table-shell">
        <div className="border-b px-5 py-4 sm:px-6">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-full max-w-[22rem] animate-pulse rounded bg-muted" />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("assetCodeSeries.table.headers.name")}</TableHead>
                <TableHead>{t("assetCodeSeries.table.headers.pattern")}</TableHead>
                <TableHead>{t("assetCodeSeries.table.headers.nextCode")}</TableHead>
                <TableHead>{t("assetCodeSeries.table.headers.used")}</TableHead>
                <TableHead>{t("assetCodeSeries.table.headers.updatedAt")}</TableHead>
                <TableHead className="text-right">
                  {t("assetCodeSeries.table.headers.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="mt-2 h-4 w-44 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    <div className="mt-2 h-4 w-28 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="ml-auto h-8 w-28 animate-pulse rounded bg-muted" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <div className="empty-state">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Hash className="size-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">{t("assetCodeSeries.table.emptyTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("assetCodeSeries.table.emptyDescription")}
        </p>
        <Link
          href="/assets/series/new"
          prefetch={false}
          className={cn(buttonVariants({ variant: "default" }), "mt-5")}
        >
          {t("assetCodeSeries.table.emptyAction")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="table-shell">
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-medium text-foreground">{t("assetCodeSeries.table.heading")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("assetCodeSeries.table.headingDescription")}
            </p>
          </div>
          <div className="rounded-sm border border-border/80 bg-muted/35 px-3 py-2 text-left sm:min-w-44 sm:text-right">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {t("assetCodeSeries.table.latest")}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {latestUpdatedAt ? formatDateTime(latestUpdatedAt) : "-"}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("assetCodeSeries.table.headers.name")}</TableHead>
                <TableHead>{t("assetCodeSeries.table.headers.pattern")}</TableHead>
                <TableHead>{t("assetCodeSeries.table.headers.nextCode")}</TableHead>
                <TableHead>{t("assetCodeSeries.table.headers.used")}</TableHead>
                <TableHead>{t("assetCodeSeries.table.headers.updatedAt")}</TableHead>
                <TableHead className="text-right">{t("assetCodeSeries.table.headers.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {series.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="max-w-[20rem] text-sm text-muted-foreground">
                        {item.description?.trim() || t("assetCodeSeries.table.noDescription")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <p className="font-mono text-sm text-foreground">{getPatternExample(item)}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("assetCodeSeries.table.patternMeta", {
                          prefix: item.prefix,
                          separator: item.separator || t("assetCodeSeries.table.separatorNone"),
                          padLength: formatNumber(item.padLength),
                        })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="align-top font-mono text-sm text-primary">
                    {getPreviewCode(item)}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <p className="font-medium tabular-nums text-foreground">
                        {formatNumber(item.counter)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("assetCodeSeries.table.usedDescription")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-1 text-sm">
                      <p className="text-foreground">{formatDateTime(item.updatedAt)}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("assetCodeSeries.table.createdAt", {
                          value: formatDateTime(item.createdAt),
                        })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/assets/series/${item.id}/edit`}
                        prefetch={false}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                      >
                        <PencilLine className="size-3.5" />
                        {t("assetCodeSeries.table.edit")}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(item)}
                        className={cn(
                          buttonVariants({ variant: "destructive", size: "sm" }),
                          "gap-2",
                        )}
                      >
                        <Trash2 className="size-3.5" />
                        {t("assetCodeSeries.table.delete")}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && deletingId === null) {
            setPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent size="default">
          <AlertDialogHeader>
            <AlertDialogMedia className="text-destructive">
              <Trash2 className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("assetCodeSeries.table.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? t("assetCodeSeries.table.confirmDescription", {
                    name: pendingDelete.name,
                  })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>
              {t("assetCodeSeries.table.confirmCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingId !== null}
              onClick={() => void handleDelete()}
            >
              {deletingId !== null
                ? t("assetCodeSeries.table.deleting")
                : t("assetCodeSeries.table.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
