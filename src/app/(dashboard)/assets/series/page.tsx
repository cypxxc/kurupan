"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Boxes, Hash, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AssetCodeSeriesTable } from "@/components/tables/asset-code-series-table";
import { buttonVariants } from "@/components/ui/button";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
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

export default function AssetCodeSeriesPage() {
  const { user } = useAuth();
  const [series, setSeries] = useState<AssetCodeSeries[]>([]);
  const [loading, setLoading] = useState(true);

  const canManage = user?.role === "staff" || user?.role === "admin";

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }

    async function loadSeries() {
      setLoading(true);

      try {
        const data = await apiClient.get<AssetCodeSeries[]>("/api/asset-code-series");
        setSeries(data);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "เกิดข้อผิดพลาดระหว่างโหลดชุดรหัส"));
        setSeries([]);
      } finally {
        setLoading(false);
      }
    }

    void loadSeries();
  }, [canManage]);

  const totalUsedCodes = useMemo(
    () => series.reduce((sum, item) => sum + item.counter, 0),
    [series],
  );

  const latestUpdatedSeries = useMemo(() => {
    return [...series].sort(
      (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    )[0] ?? null;
  }, [series]);

  if (!canManage) {
    return (
      <div className="rounded-3xl border bg-card px-6 py-14 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">ไม่มีสิทธิ์จัดการชุดรหัส</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          หน้านี้สำหรับเจ้าหน้าที่และผู้ดูแลระบบเท่านั้น
        </p>
        <Link href="/assets" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>
          กลับหน้ารายการครุภัณฑ์
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/assets"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
      >
        <ArrowLeft className="size-4" />
        กลับหน้าครุภัณฑ์
      </Link>

      <div className="page-header">
        <div className="space-y-2">
          <p className="page-kicker">Asset Code Series</p>
          <div>
            <h1 className="page-title">จัดการชุดรหัส</h1>
            <p className="page-description">
              กำหนด prefix, ตัวคั่น, และจำนวนหลักของเลขรัน เพื่อให้ระบบออกรหัสครุภัณฑ์
              อัตโนมัติได้สม่ำเสมอในแต่ละกลุ่มงาน
            </p>
          </div>
        </div>

        <Link
          href="/assets/series/new"
          className={cn(buttonVariants({ variant: "default" }), "gap-2")}
        >
          <Hash className="size-4" />
          สร้างชุดรหัส
        </Link>
      </div>

      {loading ? (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="metric-tile">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-9 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-4 w-full max-w-[16rem] animate-pulse rounded bg-muted" />
            </div>
          ))}
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="metric-tile">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">จำนวนชุดรหัส</p>
              <Boxes className="size-4 text-muted-foreground" />
            </div>
            <p className="metric-value">{formatNumber(series.length)}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              จำนวนรูปแบบรหัสที่พร้อมให้เลือกใช้ตอนสร้างครุภัณฑ์
            </p>
          </div>

          <div className="metric-tile">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">รหัสที่ใช้ไปแล้ว</p>
              <Hash className="size-4 text-muted-foreground" />
            </div>
            <p className="metric-value">{formatNumber(totalUsedCodes)}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              ผลรวมเลขรันล่าสุดของทุกชุดรหัสที่ถูกใช้งานแล้ว
            </p>
          </div>

          <div className="metric-tile">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">ความเคลื่อนไหวล่าสุด</p>
              <Sparkles className="size-4 text-muted-foreground" />
            </div>
            {latestUpdatedSeries ? (
              <>
                <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                  {latestUpdatedSeries.name}
                </p>
                <p className="mt-2 font-mono text-sm text-primary">
                  {getPreviewCode(latestUpdatedSeries)}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  อัปเดตล่าสุดเมื่อ {formatDateTime(latestUpdatedSeries.updatedAt)}
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                  ยังไม่มีชุดรหัส
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  สร้างชุดรหัสแรกเพื่อเริ่มออกรหัสครุภัณฑ์อัตโนมัติจากหน้าเพิ่มครุภัณฑ์
                </p>
              </>
            )}
          </div>
        </section>
      )}

      <AssetCodeSeriesTable
        series={series}
        loading={loading}
        onDeleted={(id) => setSeries((current) => current.filter((item) => item.id !== id))}
      />
    </div>
  );
}
