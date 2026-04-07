"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, PackagePlus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  BorrowRequestFormItem,
  BorrowableAsset,
} from "@/types/borrow-requests";

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeItem(asset: BorrowableAsset): BorrowRequestFormItem {
  return {
    assetId: asset.id,
    assetCode: asset.assetCode,
    assetName: asset.name,
    category: asset.category,
    location: asset.location,
    availableQty: asset.availableQty,
    requestedQty: 1,
  };
}

export default function NewBorrowRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState<BorrowableAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [items, setItems] = useState<BorrowRequestFormItem[]>([]);
  const [purpose, setPurpose] = useState("");
  const [startDate, setStartDate] = useState(todayString());
  const [dueDate, setDueDate] = useState(todayString());
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadAssets() {
      setLoadingAssets(true);

      try {
        const response = await fetch("/api/assets?status=available");
        const result = (await response.json()) as
          | { success: true; data: BorrowableAsset[] }
          | { success: false; error?: { message?: string } };

        if (!result.success) {
          toast.error(result.error?.message ?? "ไม่สามารถโหลดรายการครุภัณฑ์ได้");
          setAssets([]);
          return;
        }

        setAssets(result.data.filter((asset) => asset.availableQty > 0));
      } catch {
        toast.error("เกิดข้อผิดพลาดระหว่างโหลดรายการครุภัณฑ์");
        setAssets([]);
      } finally {
        setLoadingAssets(false);
      }
    }

    void loadAssets();
  }, []);

  useEffect(() => {
    const preselectId = searchParams.get("assetId");
    if (!preselectId || assets.length === 0 || items.length > 0) {
      return;
    }

    const asset = assets.find((entry) => entry.id === Number(preselectId));
    if (asset) {
      setItems([makeItem(asset)]);
    }
  }, [assets, items.length, searchParams]);

  const filteredAssets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return assets;
    }

    return assets.filter((asset) => {
      return (
        asset.name.toLowerCase().includes(query) ||
        asset.assetCode.toLowerCase().includes(query) ||
        (asset.category ?? "").toLowerCase().includes(query) ||
        (asset.location ?? "").toLowerCase().includes(query)
      );
    });
  }, [assets, searchTerm]);

  const totalRequestedQty = useMemo(() => {
    return items.reduce((sum, item) => sum + item.requestedQty, 0);
  }, [items]);

  const addItem = (asset: BorrowableAsset) => {
    if (items.some((item) => item.assetId === asset.id)) {
      toast.error("ครุภัณฑ์รายการนี้ถูกเลือกแล้ว");
      return;
    }

    setItems((current) => [...current, makeItem(asset)]);
  };

  const removeItem = (assetId: number) => {
    setItems((current) => current.filter((item) => item.assetId !== assetId));
  };

  const updateQty = (assetId: number, value: string) => {
    const numeric = Number(value);

    setItems((current) =>
      current.map((item) => {
        if (item.assetId !== assetId) {
          return item;
        }

        if (!Number.isFinite(numeric)) {
          return item;
        }

        return {
          ...item,
          requestedQty: Math.max(1, Math.min(item.availableQty, numeric)),
        };
      }),
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (items.length === 0) {
      toast.error("กรุณาเลือกครุภัณฑ์อย่างน้อย 1 รายการ");
      return;
    }

    if (dueDate < startDate) {
      toast.error("กำหนดคืนต้องไม่น้อยกว่าวันที่ยืม");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/borrow-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          purpose: purpose.trim(),
          startDate,
          dueDate,
          items: items.map((item) => ({
            assetId: item.assetId,
            requestedQty: item.requestedQty,
          })),
        }),
      });

      const result = (await response.json()) as
        | { success: true; data: { id: number } }
        | { success: false; error?: { message?: string } };

      if (!result.success) {
        toast.error(result.error?.message ?? "ไม่สามารถสร้างคำขอยืมได้");
        return;
      }

      toast.success("สร้างคำขอยืมเรียบร้อยแล้ว");
      router.push(`/borrow-requests/${result.data.id}`);
      router.refresh();
    } catch {
      toast.error("เกิดข้อผิดพลาดระหว่างสร้างคำขอ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/borrow-requests"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
      >
        <ArrowLeft className="size-4" />
        กลับไปหน้ารายการคำขอ
      </Link>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border bg-card px-6 py-6 shadow-sm"
        >
          <div className="flex flex-col gap-2 border-b pb-5">
            <h1 className="text-2xl font-semibold">สร้างคำขอยืม</h1>
            <p className="text-sm text-muted-foreground">
              เลือกครุภัณฑ์ได้หลายรายการและระบุจำนวนที่ต้องการยืมในคำขอเดียว
            </p>
          </div>

          <section className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="purpose">วัตถุประสงค์</Label>
              <Textarea
                id="purpose"
                rows={4}
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder="ระบุวัตถุประสงค์หรือกิจกรรมที่ต้องการใช้ครุภัณฑ์"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">วันที่เริ่มยืม</Label>
              <Input
                id="startDate"
                type="date"
                min={todayString()}
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  if (event.target.value > dueDate) {
                    setDueDate(event.target.value);
                  }
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">กำหนดคืน</Label>
              <Input
                id="dueDate"
                type="date"
                min={startDate}
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                required
              />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">รายการที่เลือก</h2>
                <p className="text-sm text-muted-foreground">
                  ตรวจสอบจำนวนที่ต้องการยืมก่อนส่งคำขอ
                </p>
              </div>
              <div className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                {items.length} รายการ
              </div>
            </div>

            {items.length === 0 ? (
              <div className="rounded-3xl border border-dashed px-6 py-12 text-center">
                <p className="font-medium">ยังไม่ได้เลือกครุภัณฑ์</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  เลือกรายการจากตารางด้านขวาเพื่อเพิ่มเข้าในคำขอ
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>รหัส</TableHead>
                        <TableHead>ชื่อครุภัณฑ์</TableHead>
                        <TableHead className="text-center">พร้อมใช้</TableHead>
                        <TableHead className="w-28">จำนวนที่ขอ</TableHead>
                        <TableHead className="text-right">ลบ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.assetId}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {item.assetCode}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{item.assetName}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.category ?? "ไม่ระบุหมวดหมู่"} /{" "}
                                {item.location ?? "ไม่ระบุสถานที่"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{item.availableQty}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              max={item.availableQty}
                              value={item.requestedQty}
                              onChange={(event) =>
                                updateQty(item.assetId, event.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                className={cn(
                                  buttonVariants({ variant: "ghost", size: "sm" }),
                                  "gap-1 text-destructive hover:text-destructive",
                                )}
                                onClick={() => removeItem(item.assetId)}
                              >
                                <Trash2 className="size-4" />
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
            )}
          </section>

          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/borrow-requests"
              className={buttonVariants({ variant: "outline" })}
            >
              ยกเลิก
            </Link>
            <Button type="submit" disabled={submitting || items.length === 0}>
              {submitting ? "กำลังส่งคำขอ..." : "ส่งคำขอยืม"}
            </Button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-3xl border bg-card px-5 py-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">สรุปคำขอ</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-muted/70 px-4 py-3">
                <p className="text-xs text-muted-foreground">จำนวนรายการที่เลือก</p>
                <p className="mt-1 text-2xl font-semibold">{items.length}</p>
              </div>
              <div className="rounded-2xl bg-muted/70 px-4 py-3">
                <p className="text-xs text-muted-foreground">จำนวนรวมที่ขอยืม</p>
                <p className="mt-1 text-2xl font-semibold">{totalRequestedQty}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-card px-5 py-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <PackagePlus className="size-4" />
              Asset picker
            </div>
            <div className="mt-4 space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="ค้นหาชื่อ รหัส หมวดหมู่ หรือสถานที่"
                  className="pl-9"
                />
              </div>

              <div className="max-h-[520px] overflow-y-auto rounded-3xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ครุภัณฑ์</TableHead>
                      <TableHead className="text-center">พร้อมใช้</TableHead>
                      <TableHead className="text-right">เลือก</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingAssets ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="h-10 w-full animate-pulse rounded bg-muted" />
                          </TableCell>
                          <TableCell>
                            <div className="mx-auto h-4 w-10 animate-pulse rounded bg-muted" />
                          </TableCell>
                          <TableCell>
                            <div className="ml-auto h-8 w-16 animate-pulse rounded bg-muted" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredAssets.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-10 text-center text-sm text-muted-foreground"
                        >
                          ไม่พบครุภัณฑ์ที่พร้อมยืมตามคำค้นหา
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAssets.map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">{asset.name}</p>
                                <StatusBadge type="asset" value={asset.status} />
                              </div>
                              <p className="font-mono text-xs text-muted-foreground">
                                {asset.assetCode}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {asset.category ?? "ไม่ระบุหมวดหมู่"} /{" "}
                                {asset.location ?? "ไม่ระบุสถานที่"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{asset.availableQty}</TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addItem(asset)}
                              >
                                เลือก
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
