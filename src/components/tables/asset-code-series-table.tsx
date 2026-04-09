"use client";

import Link from "next/link";
import { PencilLine, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { AssetCodeSeries } from "@/types/asset-code-series";

function getPreviewCode(series: AssetCodeSeries) {
  return `${series.prefix}${series.separator}${String(series.counter + 1).padStart(series.padLength, "0")}`;
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
  const handleDelete = async (item: AssetCodeSeries) => {
    if (!window.confirm(`ลบชุดรหัส "${item.name}" ใช่หรือไม่`)) {
      return;
    }

    try {
      const response = await fetch(`/api/asset-code-series/${item.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as
        | { success: true }
        | { success: false; error?: { message?: string } };

      if (!result.success) {
        toast.error(result.error?.message ?? "ไม่สามารถลบชุดรหัสได้");
        return;
      }

      toast.success("ลบชุดรหัสแล้ว");
      onDeleted(item.id);
    } catch {
      toast.error("เกิดข้อผิดพลาดระหว่างลบชุดรหัส");
    }
  };

  if (loading) {
    return (
      <div className="table-shell">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อชุดรหัส</TableHead>
                <TableHead>รูปแบบ</TableHead>
                <TableHead>รหัสถัดไป</TableHead>
                <TableHead>ตัวนับ</TableHead>
                <TableHead>คำอธิบาย</TableHead>
                <TableHead className="text-right">การดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><div className="h-4 w-32 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-24 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-12 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-40 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="ml-auto h-8 w-24 animate-pulse rounded bg-muted" /></TableCell>
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
        <h2 className="text-lg font-semibold">ยังไม่มีชุดรหัสครุภัณฑ์</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          สร้าง prefix ชุดแรกเพื่อให้ระบบออกรหัสครุภัณฑ์อัตโนมัติ
        </p>
      </div>
    );
  }

  return (
    <div className="table-shell">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อชุดรหัส</TableHead>
              <TableHead>รูปแบบ</TableHead>
              <TableHead>รหัสถัดไป</TableHead>
              <TableHead>ตัวนับ</TableHead>
              <TableHead>คำอธิบาย</TableHead>
              <TableHead className="text-right">การดำเนินการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {series.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {item.prefix}
                  {item.separator}
                  {"0".repeat(item.padLength)}
                </TableCell>
                <TableCell className="font-mono">{getPreviewCode(item)}</TableCell>
                <TableCell className="tabular-nums">{item.counter}</TableCell>
                <TableCell>{item.description ?? "-"}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/assets/series/${item.id}/edit`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                    >
                      <PencilLine className="size-3.5" />
                      แก้ไข
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item)}
                      className={cn(buttonVariants({ variant: "destructive", size: "sm" }), "gap-2")}
                    >
                      <Trash2 className="size-3.5" />
                      ลบ
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
