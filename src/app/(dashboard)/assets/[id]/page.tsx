"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ClipboardList, ImageOff, PencilLine, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AssetForm } from "@/components/forms/asset-form";
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
import { useAuth } from "@/lib/auth-context";
import { formatAssetQuantity } from "@/lib/asset-standards";
import { cn } from "@/lib/utils";
import { toAssetFormValues, type AssetActivity, type AssetDetail } from "@/types/assets";

const BAHT_FORMATTER = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatBaht(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numericValue)) {
    return "-";
  }

  return `${BAHT_FORMATTER.format(numericValue)} บาท`;
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

function EmptyImageState({ assetName }: { assetName: string }) {
  return (
    <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-sm border border-dashed border-border/80 bg-muted/20 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
        <ImageOff className="size-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold">ยังไม่มีรูปภาพครุภัณฑ์</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        รายการ {assetName} ยังไม่ได้อัปโหลดภาพประกอบ จึงแสดงเฉพาะข้อมูลรายละเอียดและสถานะการใช้งาน
      </p>
    </div>
  );
}

function ActivityStatus({ activity }: { activity: AssetActivity }) {
  if (activity.type === "borrow") {
    return <StatusBadge type="borrow" value={activity.status} />;
  }

  return <StatusBadge type="condition" value={activity.status} />;
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInlineEditor, setShowInlineEditor] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canManage = user?.role === "staff" || user?.role === "admin";

  useEffect(() => {
    async function loadAsset() {
      setLoading(true);

      try {
        const response = await fetch(`/api/assets/${id}`);
        const result = (await response.json()) as
          | { success: true; data: AssetDetail }
          | { success: false; error?: { message?: string } };

        if (!result.success) {
          toast.error(result.error?.message ?? "ไม่สามารถโหลดข้อมูลครุภัณฑ์ได้");
          setAsset(null);
          return;
        }

        setAsset(result.data);
      } catch {
        toast.error("เกิดข้อผิดพลาดระหว่างโหลดข้อมูลครุภัณฑ์");
        setAsset(null);
      } finally {
        setLoading(false);
      }
    }

    void loadAsset();
  }, [id]);

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
          <h1 className="text-xl font-semibold">ไม่พบครุภัณฑ์</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            รายการที่ต้องการอาจถูกลบหรือไม่มีอยู่ในระบบ
          </p>
          <Link
            href="/assets"
            className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
          >
            กลับไปหน้ารายการ
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
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as
        | { success: true; data: { id: number } }
        | { success: false; error?: { message?: string } };

      if (!result.success) {
        toast.error(result.error?.message ?? "Unable to delete this asset.");
        return;
      }

      setDeleteDialogOpen(false);
      toast.success("Asset deleted.");
      router.replace("/assets");
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred while deleting the asset.");
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
            {showInlineEditor ? "ซ่อนฟอร์มแก้ไข" : "แก้ไขแบบด่วน"}
          </button>
          <Link
            href={`/assets/${asset.id}/edit`}
            className={cn(buttonVariants({ variant: "ghost" }), "gap-2")}
          >
            <PencilLine className="size-4" />
            เปิดหน้าแก้ไขเต็ม
          </Link>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            className="gap-2"
          >
            <Trash2 className="size-4" />
            Delete asset
          </Button>
        </>
      ) : null}
      {borrowable ? (
        <Link
          href={`/borrow-requests/new?assetId=${asset.id}`}
          className={cn(buttonVariants({ variant: "default" }), "gap-2")}
        >
          <ClipboardList className="size-4" />
          ยืมครุภัณฑ์
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
        กลับไปหน้ารายการครุภัณฑ์
      </Link>

      <section className="surface-panel overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="surface-section border-b xl:border-b-0 xl:border-r">
            <div className="flex flex-col gap-6">
              {hasActions ? (
                <div className="flex flex-col gap-4 xl:hidden">{actionButtons}</div>
              ) : null}

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
                    {asset.description ?? "ไม่มีรายละเอียดเพิ่มเติมสำหรับครุภัณฑ์รายการนี้"}
                  </p>
                </div>
                <StatusBadge type="asset" value={asset.status} className="w-fit" />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryMetric
                  label="พร้อมใช้งาน"
                  value={formatAssetQuantity(asset.availableQty)}
                  helper="จำนวนที่เบิกใช้ได้ทันที"
                />
                <SummaryMetric
                  label="กำลังถูกใช้งาน"
                  value={formatAssetQuantity(unavailableQty)}
                  helper="กำลังอยู่ระหว่างยืมหรือไม่พร้อมใช้งาน"
                />
                <SummaryMetric
                  label="จำนวนทั้งหมด"
                  value={formatAssetQuantity(asset.totalQty)}
                  helper="ยอดคงคลังรวมของรายการนี้"
                />
                {canManage ? (
                  <SummaryMetric
                    label="Borrowed"
                    value={formatAssetQuantity(borrowInsights?.totalBorrowCount ?? 0)}
                    helper="Approved borrow events recorded for this asset."
                  />
                ) : null}
              </div>
            </div>
          </div>

          <aside className="surface-section flex flex-col gap-5 bg-muted/18">
            {hasActions ? (
              <div className="hidden xl:grid xl:gap-2">{actionButtons}</div>
            ) : null}

            <div className="rounded-sm border border-border/80 bg-card px-4 py-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                อัตราพร้อมใช้งาน
              </p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-3xl font-semibold tracking-tight tabular-nums">
                  {stockRatio}%
                </p>
                <p className="text-right text-xs leading-5 text-muted-foreground">
                  พร้อมใช้งาน {formatAssetQuantity(asset.availableQty)} จาก{" "}
                  {formatAssetQuantity(asset.totalQty)}
                </p>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="dashboard-chart-progress h-full rounded-full bg-primary transition-all"
                  data-chart-ready="true"
                  style={{ width: `${stockRatio}%` }}
                />
              </div>
            </div>

            <div className="rounded-sm border border-border/80 bg-card px-4 py-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                สรุปข้อมูลย่อ
              </p>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">หมวดหมู่</dt>
                  <dd className="text-right font-medium">{asset.category ?? "-"}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">สถานที่จัดเก็บ</dt>
                  <dd className="text-right font-medium">{asset.location ?? "-"}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">อัปเดตล่าสุด</dt>
                  <dd className="text-right font-medium">{formatDateTime(asset.updatedAt)}</dd>
                </div>
              </dl>
            </div>
            {canManage ? (
              <div className="rounded-sm border border-border/80 bg-card px-4 py-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground">
                  Borrowing insight
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  How often this asset has been issued and who borrowed it.
                </p>

                {borrowInsights?.hasHistory ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <InsightMetric
                      label="Borrow count"
                      value={formatAssetQuantity(borrowInsights.totalBorrowCount)}
                      helper="Approved borrow events recorded for this asset."
                    />
                    <InsightMetric
                      label="Units borrowed"
                      value={formatAssetQuantity(borrowInsights.totalBorrowedQty)}
                      helper="Total quantity issued across all borrow events."
                    />
                    <InsightMetric
                      label="Unique borrowers"
                      value={formatAssetQuantity(borrowInsights.uniqueBorrowerCount)}
                      helper="Distinct borrower names found in the history."
                    />
                    <InsightMetric
                      label="Last borrowed"
                      value={
                        borrowInsights.latestBorrow
                          ? formatDateTime(borrowInsights.latestBorrow.occurredAt)
                          : "-"
                      }
                      helper={
                        borrowInsights.latestBorrow
                          ? `${borrowInsights.latestBorrow.borrowerName} · ${borrowInsights.latestBorrow.requestNo}`
                          : "No recent borrow event."
                      }
                    />
                  </div>
                ) : (
                  <div className="mt-4 rounded-sm border border-dashed border-border/80 bg-muted/20 px-4 py-5">
                    <p className="text-sm font-medium">No borrow history yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This asset has not been approved in any borrow request so far.
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
            title="ภาพประกอบ"
            description="ตรวจสอบภาพของครุภัณฑ์เพื่อยืนยันสภาพและอุปกรณ์ที่แนบมากับรายการ"
            trailing={
              asset.images.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {asset.images.length} ภาพ
                </p>
              ) : null
            }
          />
          <div className="px-6 py-6">
            {asset.images.length > 0 ? (
              <AssetImageGallery assetName={asset.name} images={asset.images} />
            ) : (
              <EmptyImageState assetName={asset.name} />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="surface-panel overflow-hidden">
            <SectionHeading
              title="ข้อมูลครุภัณฑ์"
              description="รายละเอียดหลักที่ใช้สำหรับอ้างอิงรายการและติดตามสถานะในระบบ"
            />
            <div className="grid gap-4 px-6 py-6 sm:grid-cols-2">
              <DetailField label="รหัสครุภัณฑ์" value={asset.assetCode} />
              <DetailField
                label="สถานะปัจจุบัน"
                value={<StatusBadge type="asset" value={asset.status} className="w-fit" />}
              />
              <DetailField label="หมวดหมู่" value={asset.category ?? "-"} />
              <DetailField label="สถานที่จัดเก็บ" value={asset.location ?? "-"} />
              <DetailField
                label="สร้างเมื่อ"
                value={formatDateTime(asset.createdAt)}
                helper="วันที่สร้างรายการในระบบ"
              />
              <DetailField
                label="อัปเดตล่าสุด"
                value={formatDateTime(asset.updatedAt)}
                helper="เวลาที่แก้ไขข้อมูลครั้งล่าสุด"
              />
            </div>
          </section>

          <section className="surface-panel overflow-hidden">
            <SectionHeading
              title="ข้อมูลการเงิน"
              description="ข้อมูลราคาซื้อและค่าเสื่อมสำหรับการติดตามมูลค่าครุภัณฑ์"
            />
            <div className="grid gap-4 px-6 py-6 sm:grid-cols-2">
              <DetailField label="ราคาซื้อ" value={formatBaht(asset.purchasePrice)} />
              <DetailField
                label="วันที่เริ่มใช้งาน"
                value={asset.purchaseDate ? formatDate(asset.purchaseDate) : "-"}
              />
              <DetailField
                label="อายุการใช้งาน"
                value={
                  asset.usefulLifeYears ? `${formatAssetQuantity(asset.usefulLifeYears)} ปี` : "-"
                }
              />
              <DetailField label="มูลค่าซาก" value={formatBaht(asset.residualValue)} />
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
            title="แก้ไขข้อมูลแบบด่วน"
            description="ปรับข้อมูลหลักของครุภัณฑ์ได้ทันทีโดยไม่ต้องออกจากหน้า detail"
          />
          <div className="px-6 py-6">
            <AssetForm
              mode="edit"
              asset={asset}
              initialValues={toAssetFormValues(asset)}
            />
          </div>
        </section>
      ) : null}

      {canManage ? (
        <section className="table-shell">
        <SectionHeading
          title="ประวัติการยืม-คืน"
          description="ไทม์ไลน์การเบิกใช้งานและการคืนของครุภัณฑ์รายการนี้"
          trailing={
            asset.activity.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {asset.activity.length} รายการ
              </p>
            ) : null
          }
        />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เมื่อ</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>คำขออ้างอิง</TableHead>
                <TableHead>ผู้ยืม</TableHead>
                <TableHead className="text-center">จำนวน</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>หมายเหตุ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {asset.activity.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    ยังไม่มีประวัติการยืม-คืนสำหรับครุภัณฑ์รายการนี้
                  </TableCell>
                </TableRow>
              ) : (
                asset.activity.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(activity.occurredAt)}
                    </TableCell>
                    <TableCell>{activity.type === "borrow" ? "ยืม" : "คืน"}</TableCell>
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
            <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
            <AlertDialogDescription>
              {asset.assetCode} {asset.name} will be removed permanently, including uploaded
              images. Deletion is blocked when the asset is already referenced by borrow or
              return records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Close</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete asset"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
