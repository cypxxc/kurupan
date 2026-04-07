"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ClipboardList, PencilLine } from "lucide-react";
import { toast } from "sonner";

import { AssetForm } from "@/components/forms/asset-form";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { toAssetFormValues, type AssetActivity, type AssetDetail } from "@/types/assets";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-muted/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
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
  const { user } = useAuth();
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInlineEditor, setShowInlineEditor] = useState(false);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="rounded-3xl border bg-card px-6 py-6">
          <div className="h-8 w-56 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="rounded-3xl border bg-card px-6 py-14 text-center">
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
    );
  }

  const borrowable = asset.status === "available" && asset.availableQty > 0;

  return (
    <div className="space-y-6">
      <Link
        href="/assets"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
      >
        <ArrowLeft className="size-4" />
        กลับไปหน้ารายการครุภัณฑ์
      </Link>

      <section className="rounded-3xl border bg-card px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {asset.assetCode}
            </p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{asset.name}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {asset.description ?? "ไม่มีรายละเอียดเพิ่มเติมสำหรับครุภัณฑ์รายการนี้"}
              </p>
            </div>
            <StatusBadge type="asset" value={asset.status} className="w-fit" />
          </div>

          <div className="flex flex-wrap gap-2">
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
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailField label="หมวดหมู่" value={asset.category ?? "-"} />
            <DetailField label="สถานที่จัดเก็บ" value={asset.location ?? "-"} />
            <DetailField label="สร้างเมื่อ" value={formatDateTime(asset.createdAt)} />
            <DetailField label="อัปเดตล่าสุด" value={formatDateTime(asset.updatedAt)} />
          </div>

          <aside className="rounded-3xl bg-muted/60 px-5 py-5">
            <p className="text-sm font-medium text-muted-foreground">สรุปจำนวน</p>
            <div className="mt-4">
              <p className="text-4xl font-semibold">
                {asset.availableQty}
                <span className="ml-2 text-lg font-normal text-muted-foreground">
                  / {asset.totalQty}
                </span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                พร้อมใช้งาน / จำนวนทั้งหมด
              </p>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${stockRatio}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              อัตราพร้อมใช้งาน {stockRatio}%
            </p>
          </aside>
        </div>
      </section>

      {canManage && showInlineEditor ? (
        <section className="rounded-3xl border bg-card px-6 py-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">แก้ไขข้อมูลครุภัณฑ์แบบ inline</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ใช้สำหรับปรับข้อมูลหลักของรายการนี้โดยไม่ต้องออกจากหน้า detail
            </p>
          </div>
          <AssetForm
            mode="edit"
            asset={asset}
            initialValues={toAssetFormValues(asset)}
          />
        </section>
      ) : null}

      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="border-b px-6 py-5">
          <h2 className="text-lg font-semibold">ประวัติการยืม-คืน</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            แสดงการยืมและการคืนของครุภัณฑ์รายการนี้ย้อนหลัง
          </p>
        </div>
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
                    <TableCell>
                      {activity.type === "borrow" ? "ยืม" : "คืน"}
                    </TableCell>
                    <TableCell className="font-medium">{activity.requestNo}</TableCell>
                    <TableCell>{activity.borrowerName}</TableCell>
                    <TableCell className="text-center">{activity.qty}</TableCell>
                    <TableCell>
                      <ActivityStatus activity={activity} />
                    </TableCell>
                    <TableCell>{activity.note ?? "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
