"use client";

import Link from "next/link";
import { Archive, Box, Search } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAssetQuantity } from "@/lib/asset-standards";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types/assets";

export function AssetDataTable({
  assets,
  loading,
  canManage,
  searchTerm,
  page,
  limit,
  total,
  totalPages,
  onPageChange,
}: {
  assets: Asset[];
  loading: boolean;
  canManage: boolean;
  searchTerm: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useI18n();
  const currentPage = Math.min(page, Math.max(1, totalPages));

  if (loading) {
    return (
      <div className="table-shell">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("assets.table.headers.code")}</TableHead>
                <TableHead>{t("assets.table.headers.name")}</TableHead>
                <TableHead className="hidden lg:table-cell">
                  {t("assets.table.headers.category")}
                </TableHead>
                <TableHead className="hidden xl:table-cell">
                  {t("assets.table.headers.location")}
                </TableHead>
                <TableHead>{t("assets.table.headers.quantity")}</TableHead>
                <TableHead>{t("assets.table.headers.status")}</TableHead>
                <TableHead className="text-right">
                  {t("assets.table.headers.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="ml-auto h-7 w-24 animate-pulse rounded bg-muted" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (assets.length === 0) {
    const searching = searchTerm.trim().length > 0;

    return (
      <div className="empty-state">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          {searching ? <Search className="size-6" /> : <Archive className="size-6" />}
        </div>
        <h2 className="mt-4 text-lg font-semibold">
          {searching
            ? t("assets.table.empty.searchTitle")
            : t("assets.table.empty.defaultTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {searching
            ? t("assets.table.empty.searchDescription")
            : t("assets.table.empty.defaultDescription")}
        </p>
        {canManage && !searching ? (
          <Link
            href="/assets/new"
            prefetch={false}
            className={cn(buttonVariants({ variant: "default" }), "mt-5")}
          >
            {t("assets.table.empty.addAsset")}
          </Link>
        ) : null}
      </div>
    );
  }

  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, total);

  return (
    <div className="table-shell">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("assets.table.headers.code")}</TableHead>
              <TableHead>{t("assets.table.headers.name")}</TableHead>
              <TableHead className="hidden lg:table-cell">
                {t("assets.table.headers.category")}
              </TableHead>
              <TableHead className="hidden xl:table-cell">
                {t("assets.table.headers.location")}
              </TableHead>
              <TableHead>{t("assets.table.headers.quantity")}</TableHead>
              <TableHead>{t("assets.table.headers.status")}</TableHead>
              <TableHead className="text-right">
                {t("assets.table.headers.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => {
              const borrowable = asset.status === "available" && asset.availableQty > 0;

              return (
                <TableRow key={asset.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {asset.assetCode}
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-56 items-center gap-3">
                      {asset.primaryImageUrl ? (
                        <div className="size-11 shrink-0 overflow-hidden rounded-sm border border-border/80 bg-muted/30">
                          {/* Asset images may resolve from local uploads or external blob URLs at runtime. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={asset.primaryImageUrl}
                            alt={asset.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-border/80 bg-muted/55 text-muted-foreground">
                          <Box className="size-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/assets/${asset.id}`}
                          prefetch={false}
                          title={asset.name}
                          className="asset-title-clamp block max-w-[18rem] text-sm leading-5 font-medium transition-colors hover:text-primary sm:max-w-[24rem] xl:max-w-[32rem]"
                        >
                          {asset.name}
                        </Link>
                        {asset.availableQty === 0 ? (
                          <div className="mt-1">
                            <Badge
                              variant="outline"
                              className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            >
                              {t("assets.table.outOfStock")}
                            </Badge>
                          </div>
                        ) : null}
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground lg:hidden">
                          <span>
                            {asset.category ?? t("common.placeholders.uncategorized")}
                          </span>
                          <span>
                            {asset.location ??
                              t("common.placeholders.unspecifiedLocation")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {asset.category ?? "-"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground xl:table-cell">
                    {asset.location ?? "-"}
                  </TableCell>
                  <TableCell>
                    <div className="min-w-24">
                      <p
                        className={cn(
                          "font-medium tabular-nums",
                          asset.availableQty === 0 && "text-destructive",
                        )}
                      >
                        {formatAssetQuantity(asset.availableQty)}
                        <span className="ml-1 text-sm font-normal text-muted-foreground">
                          / {formatAssetQuantity(asset.totalQty)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("assets.table.quantityLabel")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="w-[170px]">
                    <div className="flex min-h-10 items-center">
                      <StatusBadge
                        type="asset"
                        value={asset.status}
                        className="w-fit max-w-full"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/assets/${asset.id}`}
                        prefetch={false}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        {t("common.actions.view")}
                      </Link>
                      {canManage ? (
                        <Link
                          href={`/assets/${asset.id}/edit`}
                          prefetch={false}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          {t("common.actions.edit")}
                        </Link>
                      ) : null}
                      {borrowable ? (
                        <Link
                          href={`/borrow-requests/new?assetId=${asset.id}`}
                          prefetch={false}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          {t("common.actions.borrow")}
                        </Link>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          {t("common.pagination.summary", {
            start: startItem,
            end: endItem,
            total,
          })}
        </p>
        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          previousLabel={t("common.pagination.previous")}
          nextLabel={t("common.pagination.next")}
        />
      </div>
    </div>
  );
}
