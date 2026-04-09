"use client";

import { useMemo } from "react";

import {
  buildDepreciationSchedule,
  calculateDepreciation,
} from "@/lib/depreciation";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const BAHT_FORMATTER = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatBaht(value: number) {
  return `${BAHT_FORMATTER.format(value)} บาท`;
}

export function DepreciationSection({
  purchasePrice,
  purchaseDate,
  usefulLifeYears,
  residualValue,
}: {
  purchasePrice: number;
  purchaseDate: string;
  usefulLifeYears: number;
  residualValue: number;
}) {
  const result = useMemo(
    () =>
      calculateDepreciation({
        purchasePrice,
        purchaseDate,
        usefulLifeYears,
        residualValue,
      }),
    [purchaseDate, purchasePrice, residualValue, usefulLifeYears],
  );

  const schedule = useMemo(
    () =>
      buildDepreciationSchedule({
        purchasePrice,
        purchaseDate,
        usefulLifeYears,
        residualValue,
      }),
    [purchaseDate, purchasePrice, residualValue, usefulLifeYears],
  );

  const highlightedYear = result.isFullyDepreciated
    ? usefulLifeYears
    : Math.min(result.elapsedYears + 1, usefulLifeYears);

  return (
    <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="border-b px-6 py-5">
        <h2 className="text-lg font-semibold">ค่าเสื่อมราคา</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          คำนวณแบบเส้นตรงตามอายุการใช้งานที่กำหนด
        </p>
      </div>

      <div className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "ราคาซื้อ", value: formatBaht(purchasePrice) },
          { label: "ค่าเสื่อมต่อปี", value: formatBaht(result.annualDepreciation) },
          { label: "ค่าเสื่อมสะสม", value: formatBaht(result.accumulatedDepreciation) },
          { label: "มูลค่าตามบัญชี", value: formatBaht(result.netBookValue) },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl bg-muted/60 px-4 py-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-xl font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="border-t px-6 py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">ตารางค่าเสื่อม</p>
            <p className="text-sm text-muted-foreground">
              อายุการใช้งาน {usefulLifeYears} ปี เริ่มใช้งานวันที่ {purchaseDate}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            ตัดค่าเสื่อมแล้ว {result.elapsedYears} ปี
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ปี</TableHead>
                <TableHead>ค่าเสื่อมประจำปี</TableHead>
                <TableHead>ค่าเสื่อมสะสม</TableHead>
                <TableHead>มูลค่าตามบัญชี</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((row) => (
                <TableRow
                  key={row.year}
                  className={cn(row.year === highlightedYear && "bg-primary/5")}
                >
                  <TableCell className="font-medium">ปีที่ {row.year}</TableCell>
                  <TableCell>{formatBaht(row.annualDepreciation)}</TableCell>
                  <TableCell>{formatBaht(row.accumulatedDepreciation)}</TableCell>
                  <TableCell>{formatBaht(row.netBookValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}
