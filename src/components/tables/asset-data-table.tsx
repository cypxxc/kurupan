"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Archive, Box, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Asset, AssetStatus } from "@/types/assets";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: Array<{ value: AssetStatus; label: string }> = [
  { value: "available", label: "พร้อมใช้งาน" },
  { value: "maintenance", label: "ซ่อมบำรุง" },
  { value: "retired", label: "ปลดระวาง" },
];

export function AssetDataTable({
  assets,
  loading,
  canManage,
  searchTerm,
  onAssetUpdated,
}: {
  assets: Asset[];
  loading: boolean;
  canManage: boolean;
  searchTerm: string;
  onAssetUpdated: (asset: Asset) => void;
}) {
  const [page, setPage] = useState(1);
  const [updatingAssetId, setUpdatingAssetId] = useState<number | null>(null);

  const pageCount = Math.max(1, Math.ceil(assets.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  const visibleAssets = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return assets.slice(start, start + PAGE_SIZE);
  }, [assets, currentPage]);

  const updateStatus = async (asset: Asset, status: AssetStatus) => {
    if (asset.status === status) {
      return;
    }

    setUpdatingAssetId(asset.id);

    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json()) as
        | { success: true; data: Asset }
        | { success: false; error?: { message?: string } };

      if (!result.success) {
        toast.error(result.error?.message ?? "ไม่สามารถอัปเดตสถานะครุภัณฑ์ได้");
        return;
      }

      onAssetUpdated(result.data);
      toast.success("อัปเดตสถานะครุภัณฑ์แล้ว");
    } catch {
      toast.error("เกิดข้อผิดพลาดระหว่างอัปเดตสถานะครุภัณฑ์");
    } finally {
      setUpdatingAssetId(null);
    }
  };

  if (loading) {
    return (
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัส</TableHead>
                <TableHead>ชื่อครุภัณฑ์</TableHead>
                <TableHead className="hidden lg:table-cell">หมวดหมู่</TableHead>
                <TableHead className="hidden xl:table-cell">สถานที่</TableHead>
                <TableHead>คงเหลือ</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">การดำเนินการ</TableHead>
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
      <div className="rounded-3xl border bg-card px-6 py-14 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          {searching ? <Search className="size-6" /> : <Archive className="size-6" />}
        </div>
        <h2 className="mt-4 text-lg font-semibold">
          {searching ? "ไม่พบผลลัพธ์" : "ยังไม่มีครุภัณฑ์"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {searching
            ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง"
            : "เพิ่มข้อมูลครุภัณฑ์เพื่อเริ่มจัดการรายการยืม-คืน"}
        </p>
        {canManage && !searching ? (
          <Link
            href="/assets/new"
            className={cn(buttonVariants({ variant: "default" }), "mt-5")}
          >
            เพิ่มครุภัณฑ์
          </Link>
        ) : null}
      </div>
    );
  }

  const startItem = (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, assets.length);

  return (
    <div className="overflow-hidden rounded-3xl border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัส</TableHead>
              <TableHead>ชื่อครุภัณฑ์</TableHead>
              <TableHead className="hidden lg:table-cell">หมวดหมู่</TableHead>
              <TableHead className="hidden xl:table-cell">สถานที่</TableHead>
              <TableHead>คงเหลือ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">การดำเนินการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleAssets.map((asset) => {
              const borrowable = asset.status === "available" && asset.availableQty > 0;
              const updating = updatingAssetId === asset.id;

              return (
                <TableRow key={asset.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {asset.assetCode}
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-56 items-start gap-3">
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                        <Box className="size-4" />
                      </div>
                      <div className="space-y-1">
                        <Link
                          href={`/assets/${asset.id}`}
                          className="font-medium transition-colors hover:text-primary"
                        >
                          {asset.name}
                        </Link>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground lg:hidden">
                          <span>{asset.category ?? "ไม่ระบุหมวดหมู่"}</span>
                          <span>{asset.location ?? "ไม่ระบุสถานที่"}</span>
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
                    <div className="min-w-20">
                      <p
                        className={cn(
                          "font-medium",
                          asset.availableQty === 0 && "text-destructive",
                        )}
                      >
                        {asset.availableQty}
                        <span className="ml-1 text-sm font-normal text-muted-foreground">
                          / {asset.totalQty}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">พร้อมใช้ / ทั้งหมด</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <StatusBadge type="asset" value={asset.status} />
                      {canManage ? (
                        <Combobox
                          value={asset.status}
                          onChange={(value) => void updateStatus(asset, (value || asset.status) as AssetStatus)}
                          disabled={updating}
                          options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                          className="w-[150px]"
                        />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/assets/${asset.id}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        ดู
                      </Link>
                      {canManage ? (
                        <Link
                          href={`/assets/${asset.id}/edit`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          แก้ไข
                        </Link>
                      ) : null}
                      {borrowable ? (
                        <Link
                          href={`/borrow-requests/new?assetId=${asset.id}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          ยืม
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
          แสดง {startItem}-{endItem} จาก {assets.length} รายการ
        </p>
        <div className="flex items-center gap-2 self-end">
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1",
            )}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="size-3.5" />
            ก่อนหน้า
          </button>
          <span className="min-w-16 text-center text-muted-foreground">
            {currentPage} / {pageCount}
          </span>
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1",
            )}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            disabled={currentPage === pageCount}
          >
            ถัดไป
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
