"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ClipboardList, ImageOff, PencilLine, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AssetForm } from "@/components/forms/asset-form";
import { useI18n } from "@/components/providers/i18n-provider";
import { AssetImageGallery } from "@/components/shared/asset-image-gallery";
import { DepreciationSection } from "@/components/shared/depreciation-section";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { formatAssetQuantity } from "@/lib/asset-standards";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { toAssetFormValues, type AssetActivity, type AssetDetail } from "@/types/assets";

function resolveIntlLocale(locale: string) {
  return locale === "en" ? "en-US" : "th-TH";
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatBaht(
  value: number | string | null | undefined,
  locale: string,
  unitLabel: string,
) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numericValue)) {
    return "-";
  }

  return `${new Intl.NumberFormat(resolveIntlLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue)} ${unitLabel}`;
}

function DetailField({
  label,
  value,
  helper,
}: {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
}) {
  return (
    <div className="rounded-sm border border-border/80 bg-muted/35 px-4 py-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 text-sm font-medium leading-6 text-foreground">{value}</div>
      {helper ? (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: ReactNode;
  helper: string;
}) {
  return (
    <div className="rounded-sm border border-border/80 bg-muted/30 px-4 py-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>
    </div>
  );
}

function InsightMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: ReactNode;
  helper: string;
}) {
  return (
    <div className="rounded-sm border border-border/80 bg-muted/20 px-4 py-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 text-xl font-semibold tracking-tight tabular-nums">{value}</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>
    </div>
  );
}

function SectionHeading({
  title,
  description,
  trailing,
}: {
  title: string;
  description: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b px-6 py-5">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {trailing}
    </div>
  );
}

function EmptyImageState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-sm border border-dashed border-border/80 bg-muted/20 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
        <ImageOff className="size-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function ActivityStatus({ activity }: { activity: AssetActivity }) {
  if (activity.type === "borrow") {
    return <StatusBadge type="borrow" value={activity.status} />;
  }

  return <StatusBadge type="condition" value={activity.status} />;
}

type AssetDetailPageClientProps = {
  initialAsset: AssetDetail | null;
};

export default function AssetDetailPageClient({
  initialAsset,
}: AssetDetailPageClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { locale, t } = useI18n();
  const [asset, setAsset] = useState<AssetDetail | null>(initialAsset);
  const [loading, setLoading] = useState(false);
  const [showInlineEditor, setShowInlineEditor] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canManage = user?.role === "staff" || user?.role === "admin";

  useEffect(() => {
    setAsset(initialAsset);
    setLoading(false);
  }, [initialAsset]);

  const stockRatio = useMemo(() => {
    if (!asset || asset.totalQty === 0) {
      return 0;
    }

    return Math.min(100, Math.round((asset.availableQty / asset.totalQty) * 100));
  }, [asset]);

  const borrowInsights = useMemo(() => {
    if (!asset) {
      return null;
    }

    const borrowActivities = asset.activity.filter((activity) => activity.type === "borrow");

    return {
      totalBorrowCount: borrowActivities.length,
      totalBorrowedQty: borrowActivities.reduce((sum, activity) => sum + activity.qty, 0),
      uniqueBorrowerCount: new Set(
        borrowActivities
          .map((activity) => activity.borrowerName.trim())
          .filter((value) => value.length > 0),
      ).size,
      latestBorrow: borrowActivities[0] ?? null,
      hasHistory: borrowActivities.length > 0,
    };
  }, [asset]);

  if (loading) {
    return (
      <div className="app-page">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="surface-panel overflow-hidden">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="surface-section border-b xl:border-b-0 xl:border-r">
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-4 h-10 w-80 max-w-full animate-pulse rounded bg-muted" />
              <div className="mt-3 h-5 w-72 max-w-full animate-pulse rounded bg-muted" />
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-28 animate-pulse rounded-sm bg-muted" />
                ))}
              </div>
            </div>
            <div className="surface-section">
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
              <div className="mt-3 h-10 w-full animate-pulse rounded bg-muted" />
              <div className="mt-5 h-36 animate-pulse rounded-sm bg-muted" />
            </div>
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="surface-panel h-[26rem] animate-pulse bg-muted/40" />
          <div className="space-y-6">
            <div className="surface-panel h-64 animate-pulse bg-muted/40" />
            <div className="surface-panel h-64 animate-pulse bg-muted/40" />
          </div>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="app-page">
        <div className="empty-state">
          <h1 className="text-xl font-semibold">{t("assetDetail.notFound.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("assetDetail.notFound.description")}</p>
          <Link href="/assets" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>
            {t("assetDetail.actions.backToAssets")}
          </Link>
        </div>
      </div>
    );
  }

  const borrowable = asset.status === "available" && asset.availableQty > 0;
  const hasDepreciationData = Boolean(
    asset.purchasePrice && asset.purchaseDate && asset.usefulLifeYears,
  );
  const unavailableQty = Math.max(asset.totalQty - asset.availableQty, 0);
  const hasActions = canManage || borrowable;

  const handleDelete = async () => {
    setDeleting(true);

    try {
      await apiClient.delete<void>(`/api/assets/${asset.id}`, {
        parseAs: "void",
      });

      setDeleteDialogOpen(false);
      toast.success(t("assetDetail.deleted"));
      router.replace("/assets");
      router.refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("assetDetail.deleteError")));
    } finally {
      setDeleting(false);
    }
  };

  const actionButtons = (
    <>
      {canManage ? (
        <>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            onClick={() => setShowInlineEditor((current) => !current)}
          >
            <PencilLine className="size-4" />
            {showInlineEditor
              ? t("assetDetail.actions.hideQuickEdit")
              : t("assetDetail.actions.quickEdit")}
          </button>
          <Link
            href={`/assets/${asset.id}/edit`}
            className={cn(buttonVariants({ variant: "ghost" }), "gap-2")}
          >
            <PencilLine className="size-4" />
            {t("assetDetail.actions.openFullEditPage")}
          </Link>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            className="gap-2"
          >
            <Trash2 className="size-4" />
            {t("assetDetail.actions.deleteAsset")}
          </Button>
        </>
      ) : null}
      {borrowable ? (
        <Link
          href={`/borrow-requests/new?assetId=${asset.id}`}
          className={cn(buttonVariants({ variant: "default" }), "gap-2")}
        >
          <ClipboardList className="size-4" />
          {t("assetDetail.actions.borrowAsset")}
        </Link>
      ) : null}
    </>
  );

  return (
    <div className="app-page">
      <Link
        href="/assets"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
      >
        <ArrowLeft className="size-4" />
        {t("assetDetail.actions.backToAssets")}
      </Link>

      <section className="surface-panel overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="surface-section border-b xl:border-b-0 xl:border-r">
            <div className="flex flex-col gap-6">
              {hasActions ? <div className="flex flex-col gap-4 xl:hidden">{actionButtons}</div> : null}

              <div className="space-y-4">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {asset.assetCode}
                </p>
                <div>
                  <h1
                    title={asset.name}
                    className="asset-title-clamp max-w-[56rem] break-words text-3xl font-semibold tracking-tight sm:text-[2.2rem]"
                  >
                    {asset.name}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                    {asset.description ?? t("assetDetail.fallbackDescription")}
                  </p>
                </div>
                <StatusBadge type="asset" value={asset.status} className="w-fit" />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryMetric
                  label={t("assetDetail.summary.availableLabel")}
                  value={formatAssetQuantity(asset.availableQty)}
                  helper={t("assetDetail.summary.availableHelper")}
                />
                <SummaryMetric
                  label={t("assetDetail.summary.inUseLabel")}
                  value={formatAssetQuantity(unavailableQty)}
                  helper={t("assetDetail.summary.inUseHelper")}
                />
                <SummaryMetric
                  label={t("assetDetail.summary.totalLabel")}
                  value={formatAssetQuantity(asset.totalQty)}
                  helper={t("assetDetail.summary.totalHelper")}
                />
                {canManage ? (
                  <SummaryMetric
                    label={t("assetDetail.summary.borrowedLabel")}
                    value={formatAssetQuantity(borrowInsights?.totalBorrowCount ?? 0)}
                    helper={t("assetDetail.summary.borrowedHelper")}
                  />
                ) : null}
              </div>
            </div>
          </div>

          <aside className="surface-section flex flex-col gap-5 bg-muted/18">
            {hasActions ? <div className="hidden xl:grid xl:gap-2">{actionButtons}</div> : null}

            <div className="rounded-sm border border-border/80 bg-card px-4 py-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                {t("assetDetail.availability.title")}
              </p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-3xl font-semibold tracking-tight tabular-nums">{stockRatio}%</p>
                <p className="text-right text-xs leading-5 text-muted-foreground">
                  {t("assetDetail.availability.readyToUse", {
                    available: formatAssetQuantity(asset.availableQty),
                    total: formatAssetQuantity(asset.totalQty),
                  })}
                </p>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
                <progress
                  value={stockRatio}
                  max={100}
                  className="stock-progress dashboard-chart-progress h-full w-full rounded-full"
                  data-chart-ready="true"
                  aria-label={t("assetDetail.availability.title")}
                />
              </div>
            </div>

            <div className="rounded-sm border border-border/80 bg-card px-4 py-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                {t("assetDetail.quickSummary.title")}
              </p>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">{t("assetDetail.quickSummary.category")}</dt>
                  <dd className="text-right font-medium">
                    {asset.category ?? t("common.placeholders.uncategorized")}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">{t("assetDetail.quickSummary.location")}</dt>
                  <dd className="text-right font-medium">
                    {asset.location ?? t("common.placeholders.unspecifiedLocation")}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">{t("assetDetail.quickSummary.updatedAt")}</dt>
                  <dd className="text-right font-medium">{formatDateTime(asset.updatedAt, locale)}</dd>
                </div>
              </dl>
            </div>

            {canManage ? (
              <div className="rounded-sm border border-border/80 bg-card px-4 py-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground">
                  {t("assetDetail.insight.title")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("assetDetail.insight.description")}
                </p>

                {borrowInsights?.hasHistory ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <InsightMetric
                      label={t("assetDetail.insight.borrowCountLabel")}
                      value={formatAssetQuantity(borrowInsights.totalBorrowCount)}
                      helper={t("assetDetail.insight.borrowCountHelper")}
                    />
                    <InsightMetric
                      label={t("assetDetail.insight.unitsBorrowedLabel")}
                      value={formatAssetQuantity(borrowInsights.totalBorrowedQty)}
                      helper={t("assetDetail.insight.unitsBorrowedHelper")}
                    />
                    <InsightMetric
                      label={t("assetDetail.insight.uniqueBorrowersLabel")}
                      value={formatAssetQuantity(borrowInsights.uniqueBorrowerCount)}
                      helper={t("assetDetail.insight.uniqueBorrowersHelper")}
                    />
                    <InsightMetric
                      label={t("assetDetail.insight.lastBorrowedLabel")}
                      value={
                        borrowInsights.latestBorrow
                          ? formatDateTime(borrowInsights.latestBorrow.occurredAt, locale)
                          : "-"
                      }
                      helper={
                        borrowInsights.latestBorrow
                          ? `${borrowInsights.latestBorrow.borrowerName} · ${borrowInsights.latestBorrow.requestNo}`
                          : t("assetDetail.insight.noRecentBorrowEvent")
                      }
                    />
                  </div>
                ) : (
                  <div className="mt-4 rounded-sm border border-dashed border-border/80 bg-muted/20 px-4 py-5">
                    <p className="text-sm font-medium">{t("assetDetail.insight.noHistoryTitle")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("assetDetail.insight.noHistoryDescription")}
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="surface-panel overflow-hidden">
          <SectionHeading
            title={t("assetDetail.images.title")}
            description={t("assetDetail.images.description")}
            trailing={
              asset.images.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("assetDetail.images.count", { count: asset.images.length })}
                </p>
              ) : null
            }
          />
          <div className="px-6 py-6">
            {asset.images.length > 0 ? (
              <AssetImageGallery assetName={asset.name} images={asset.images} />
            ) : (
              <EmptyImageState
                title={t("assetDetail.emptyImages.title")}
                description={t("assetDetail.emptyImages.description", {
                  assetName: asset.name,
                })}
              />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="surface-panel overflow-hidden">
            <SectionHeading
              title={t("assetDetail.info.title")}
              description={t("assetDetail.info.description")}
            />
            <div className="grid gap-4 px-6 py-6 sm:grid-cols-2">
              <DetailField label={t("assetDetail.info.assetCode")} value={asset.assetCode} />
              <DetailField
                label={t("assetDetail.info.currentStatus")}
                value={<StatusBadge type="asset" value={asset.status} className="w-fit" />}
              />
              <DetailField
                label={t("assetDetail.info.category")}
                value={asset.category ?? t("common.placeholders.uncategorized")}
              />
              <DetailField
                label={t("assetDetail.info.location")}
                value={asset.location ?? t("common.placeholders.unspecifiedLocation")}
              />
              <DetailField
                label={t("assetDetail.info.createdAt")}
                value={formatDateTime(asset.createdAt, locale)}
                helper={t("assetDetail.info.createdAtHelper")}
              />
              <DetailField
                label={t("assetDetail.info.updatedAt")}
                value={formatDateTime(asset.updatedAt, locale)}
                helper={t("assetDetail.info.updatedAtHelper")}
              />
            </div>
          </section>

          <section className="surface-panel overflow-hidden">
            <SectionHeading
              title={t("assetDetail.financial.title")}
              description={t("assetDetail.financial.description")}
            />
            <div className="grid gap-4 px-6 py-6 sm:grid-cols-2">
              <DetailField
                label={t("assetDetail.financial.purchasePrice")}
                value={formatBaht(asset.purchasePrice, locale, t("assetDetail.currency.baht"))}
              />
              <DetailField
                label={t("assetDetail.financial.purchaseDate")}
                value={asset.purchaseDate ? formatDate(asset.purchaseDate, locale) : "-"}
              />
              <DetailField
                label={t("assetDetail.financial.usefulLife")}
                value={
                  asset.usefulLifeYears
                    ? t("assetDetail.financial.usefulLifeValue", {
                        years: formatAssetQuantity(asset.usefulLifeYears),
                      })
                    : "-"
                }
              />
              <DetailField
                label={t("assetDetail.financial.residualValue")}
                value={formatBaht(asset.residualValue, locale, t("assetDetail.currency.baht"))}
              />
            </div>
          </section>
        </div>
      </section>

      {hasDepreciationData ? (
        <DepreciationSection
          purchasePrice={Number(asset.purchasePrice)}
          purchaseDate={asset.purchaseDate as string}
          usefulLifeYears={asset.usefulLifeYears as number}
          residualValue={Number(asset.residualValue ?? 0)}
        />
      ) : null}

      {canManage && showInlineEditor ? (
        <section className="surface-panel overflow-hidden">
          <SectionHeading
            title={t("assetDetail.quickEdit.title")}
            description={t("assetDetail.quickEdit.description")}
          />
          <div className="px-6 py-6">
            <AssetForm mode="edit" asset={asset} initialValues={toAssetFormValues(asset)} />
          </div>
        </section>
      ) : null}

      {canManage ? (
        <section className="table-shell">
          <SectionHeading
            title={t("assetDetail.history.title")}
            description={t("assetDetail.history.description")}
            trailing={
              asset.activity.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("assetDetail.history.count", { count: asset.activity.length })}
                </p>
              ) : null
            }
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("assetDetail.history.headers.date")}</TableHead>
                  <TableHead>{t("assetDetail.history.headers.type")}</TableHead>
                  <TableHead>{t("assetDetail.history.headers.reference")}</TableHead>
                  <TableHead>{t("assetDetail.history.headers.borrower")}</TableHead>
                  <TableHead className="text-center">{t("assetDetail.history.headers.qty")}</TableHead>
                  <TableHead>{t("assetDetail.history.headers.status")}</TableHead>
                  <TableHead>{t("assetDetail.history.headers.note")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asset.activity.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      {t("assetDetail.history.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  asset.activity.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(activity.occurredAt, locale)}
                      </TableCell>
                      <TableCell>
                        {activity.type === "borrow"
                          ? t("assetDetail.history.typeBorrow")
                          : t("assetDetail.history.typeReturn")}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">
                        {activity.requestNo}
                      </TableCell>
                      <TableCell>{activity.borrowerName}</TableCell>
                      <TableCell className="text-center tabular-nums">
                        {formatAssetQuantity(activity.qty)}
                      </TableCell>
                      <TableCell>
                        <ActivityStatus activity={activity} />
                      </TableCell>
                      <TableCell className="max-w-[22rem] text-sm text-muted-foreground">
                        {activity.note ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent size="default">
          <AlertDialogHeader>
            <AlertDialogMedia className="text-destructive">
              <Trash2 className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("assetDetail.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("assetDetail.deleteDialog.description", {
                assetCode: asset.assetCode,
                assetName: asset.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.actions.close")}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? t("assetDetail.deleteDialog.deleting") : t("assetDetail.actions.deleteAsset")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
