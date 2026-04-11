"use client";

import { useMemo, useState } from "react";
import { Boxes, Hash, Sparkles } from "lucide-react";

import { AssetCodeSeriesTable } from "@/components/tables/asset-code-series-table";
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

export function AssetSeriesPageClient({
  initialSeries,
}: {
  initialSeries: AssetCodeSeries[];
}) {
  const [series, setSeries] = useState(initialSeries);

  const totalUsedCodes = useMemo(
    () => series.reduce((sum, item) => sum + item.counter, 0),
    [series],
  );

  const latestUpdatedSeries = useMemo(() => {
    return [...series].sort(
      (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    )[0] ?? null;
  }, [series]);

  return (
    <>
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

      <AssetCodeSeriesTable
        series={series}
        loading={false}
        onDeleted={(id) => setSeries((current) => current.filter((item) => item.id !== id))}
      />
    </>
  );
}
