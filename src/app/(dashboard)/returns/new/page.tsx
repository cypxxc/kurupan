"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, PackageCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import type { BorrowRequestDetail } from "@/types/borrow-requests";
import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
  type ReturnFormItem,
  type ReturnTransaction,
} from "@/types/returns";

function buildReturnedQtyMap(returns: ReturnTransaction[]) {
  const returned = new Map<number, number>();

  for (const transaction of returns) {
    for (const item of transaction.items) {
      returned.set(
        item.borrowRequestItemId,
        (returned.get(item.borrowRequestItemId) ?? 0) + item.returnQty,
      );
    }
  }

  return returned;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default function NewReturnPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [eligibleRequests, setEligibleRequests] = useState<BorrowRequestDetail[]>([]);
  const [selectedBorrowRequestId, setSelectedBorrowRequestId] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequestDetail | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnFormItem[]>([]);
  const [note, setNote] = useState("");
  const [returnedAt, setReturnedAt] = useState(toDateTimeLocalValue());
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canManage = user?.role === "staff" || user?.role === "admin";

  useEffect(() => {
    async function loadEligibleRequests() {
      setLoadingRequests(true);

      try {
        const [approvedResponse, partialResponse] = await Promise.all([
          fetch("/api/borrow-requests?status=approved"),
          fetch("/api/borrow-requests?status=partially_returned"),
        ]);

        const [approvedResult, partialResult] = (await Promise.all([
          approvedResponse.json(),
          partialResponse.json(),
        ])) as [
          { success: boolean; data?: BorrowRequestDetail[]; error?: { message?: string } },
          { success: boolean; data?: BorrowRequestDetail[]; error?: { message?: string } },
        ];

        if (!approvedResult.success || !partialResult.success) {
          toast.error(
            approvedResult.error?.message ??
              partialResult.error?.message ??
              "ไม่สามารถโหลดคำขอที่รอรับคืนได้",
          );
          setEligibleRequests([]);
          return;
        }

        const merged = [...(approvedResult.data ?? []), ...(partialResult.data ?? [])]
          .filter(
            (request, index, array) =>
              array.findIndex((candidate) => candidate.id === request.id) === index,
          )
          .sort((left, right) => right.id - left.id);

        setEligibleRequests(merged);

        const preselected = searchParams.get("borrowRequestId");
        if (preselected) {
          setSelectedBorrowRequestId(preselected);
        }
      } catch {
        toast.error("เกิดข้อผิดพลาดระหว่างโหลดคำขอสำหรับบันทึกการคืน");
        setEligibleRequests([]);
      } finally {
        setLoadingRequests(false);
      }
    }

    if (canManage) {
      void loadEligibleRequests();
    } else {
      setLoadingRequests(false);
    }
  }, [canManage, searchParams]);

  useEffect(() => {
    async function loadSelectedRequest() {
      if (!selectedBorrowRequestId) {
        setSelectedRequest(null);
        setReturnItems([]);
        return;
      }

      setLoadingItems(true);

      try {
        const [requestResponse, returnsResponse] = await Promise.all([
          fetch(`/api/borrow-requests/${selectedBorrowRequestId}`),
          fetch(`/api/returns?borrowRequestId=${selectedBorrowRequestId}`),
        ]);

        const [requestResult, returnsResult] = (await Promise.all([
          requestResponse.json(),
          returnsResponse.json(),
        ])) as [
          { success: boolean; data?: BorrowRequestDetail; error?: { message?: string } },
          { success: boolean; data?: ReturnTransaction[]; error?: { message?: string } },
        ];

        if (!requestResult.success || !returnsResult.success || !requestResult.data) {
          toast.error(
            requestResult.error?.message ??
              returnsResult.error?.message ??
              "ไม่สามารถโหลดข้อมูลคำขอที่เลือกได้",
          );
          setSelectedRequest(null);
          setReturnItems([]);
          return;
        }

        const returnedQtyMap = buildReturnedQtyMap(returnsResult.data ?? []);
        const nextItems: ReturnFormItem[] = requestResult.data.items
          .map((item) => {
            const approvedQty = item.approvedQty ?? 0;
            const returnedQty = returnedQtyMap.get(item.id) ?? 0;
            const remainingQty = Math.max(0, approvedQty - returnedQty);

            return {
              borrowRequestItemId: item.id,
              assetId: item.assetId,
              assetCode: item.assetCode,
              assetName: item.assetName,
              approvedQty,
              returnedQty,
              remainingQty,
              selected: remainingQty > 0,
              returnQty: remainingQty > 0 ? remainingQty : 0,
              condition: "good" as const,
              note: "",
            };
          })
          .filter((item) => item.remainingQty > 0);

        setSelectedRequest(requestResult.data);
        setReturnItems(nextItems);
      } catch {
        toast.error("เกิดข้อผิดพลาดระหว่างโหลดรายการที่ยังคืนไม่ครบ");
        setSelectedRequest(null);
        setReturnItems([]);
      } finally {
        setLoadingItems(false);
      }
    }

    void loadSelectedRequest();
  }, [selectedBorrowRequestId]);

  const activeItems = useMemo(() => {
    return returnItems.filter((item) => item.selected && item.returnQty > 0);
  }, [returnItems]);

  const totalQty = useMemo(() => {
    return activeItems.reduce((sum, item) => sum + item.returnQty, 0);
  }, [activeItems]);

  const updateItem = (
    borrowRequestItemId: number,
    updater: (item: ReturnFormItem) => ReturnFormItem,
  ) => {
    setReturnItems((current) =>
      current.map((item) =>
        item.borrowRequestItemId === borrowRequestItemId ? updater(item) : item,
      ),
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRequest) {
      toast.error("กรุณาเลือกคำขอที่ต้องการบันทึกการคืน");
      return;
    }

    if (activeItems.length === 0) {
      toast.error("กรุณาเลือกอย่างน้อย 1 รายการที่จะบันทึกการคืน");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/returns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          borrowRequestId: selectedRequest.id,
          returnedAt: fromDateTimeLocalValue(returnedAt),
          note: note.trim() || undefined,
          items: activeItems.map((item) => ({
            borrowRequestItemId: item.borrowRequestItemId,
            returnQty: item.returnQty,
            condition: item.condition,
            note: item.note.trim() || undefined,
          })),
        }),
      });

      const result = (await response.json()) as
        | { success: true; data: { id: number } }
        | { success: false; error?: { message?: string } };

      if (!result.success) {
        toast.error(result.error?.message ?? "ไม่สามารถบันทึกการคืนได้");
        return;
      }

      toast.success("บันทึกการคืนเรียบร้อยแล้ว");
      router.push(`/returns/${result.data.id}`);
      router.refresh();
    } catch {
      toast.error("เกิดข้อผิดพลาดระหว่างบันทึกการคืน");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManage) {
    return (
      <div className="rounded-3xl border bg-card px-6 py-14 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">ไม่มีสิทธิ์บันทึกการคืน</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          หน้านี้สำหรับเจ้าหน้าที่และผู้ดูแลระบบเท่านั้น
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/returns"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
      >
        <ArrowLeft className="size-4" />
        กลับไปหน้ารายการคืน
      </Link>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border bg-card px-6 py-6 shadow-sm"
        >
          <div className="flex flex-col gap-2 border-b pb-5">
            <h1 className="text-2xl font-semibold">บันทึกการคืน</h1>
            <p className="text-sm text-muted-foreground">
              เลือกคำขอที่ได้รับอนุมัติแล้วหรืออยู่ระหว่างคืนบางส่วน จากนั้นระบุจำนวนและสภาพของรายการที่คืน
            </p>
          </div>

          <section className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="borrowRequestId">คำขอที่ต้องการบันทึกการคืน</Label>
              <Select
                value={selectedBorrowRequestId}
                onValueChange={(value) => setSelectedBorrowRequestId(value ?? "")}
              >
                <SelectTrigger id="borrowRequestId" className="w-full">
                  <SelectValue placeholder="เลือกคำขอ" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleRequests.map((request) => (
                    <SelectItem key={request.id} value={String(request.id)}>
                      {request.requestNo} - {request.borrowerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnedAt">วันที่และเวลารับคืน</Label>
              <Input
                id="returnedAt"
                type="datetime-local"
                value={returnedAt}
                onChange={(event) => setReturnedAt(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">หมายเหตุธุรกรรม</Label>
              <Input
                id="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="เช่น รับคืนครบตามสภาพ"
              />
            </div>
          </section>

          {selectedRequest ? (
            <section className="rounded-3xl bg-muted/50 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{selectedRequest.requestNo}</p>
                <StatusBadge type="borrow" value={selectedRequest.status} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                ผู้ยืม: {selectedRequest.borrowerName} • ยืมวันที่{" "}
                {formatDate(selectedRequest.startDate)} • กำหนดคืน{" "}
                {formatDate(selectedRequest.dueDate)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedRequest.purpose ?? "ไม่มีการระบุวัตถุประสงค์"}
              </p>
            </section>
          ) : null}

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">รายการที่ยังคืนไม่ครบ</h2>
              <p className="text-sm text-muted-foreground">
                รองรับการคืนบางส่วน โดยเลือกเฉพาะรายการที่นำมาคืนในครั้งนี้
              </p>
            </div>

            <div className="overflow-x-auto rounded-3xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">เลือก</TableHead>
                    <TableHead>ครุภัณฑ์</TableHead>
                    <TableHead className="text-center">อนุมัติ</TableHead>
                    <TableHead className="text-center">คืนแล้ว</TableHead>
                    <TableHead className="text-center">คงเหลือ</TableHead>
                    <TableHead className="w-28">คืนครั้งนี้</TableHead>
                    <TableHead className="w-40">สภาพ</TableHead>
                    <TableHead>หมายเหตุ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingItems ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-12 text-center text-sm text-muted-foreground"
                      >
                        กำลังโหลดรายการที่ต้องคืน...
                      </TableCell>
                    </TableRow>
                  ) : returnItems.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-12 text-center text-sm text-muted-foreground"
                      >
                        {selectedBorrowRequestId
                          ? "คำขอนี้ไม่มีรายการคงค้างให้บันทึกการคืนแล้ว"
                          : "เลือกคำขอเพื่อแสดงรายการที่ยังคืนไม่ครบ"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    returnItems.map((item) => (
                      <TableRow key={item.borrowRequestItemId}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(event) =>
                              updateItem(item.borrowRequestItemId, (current) => ({
                                ...current,
                                selected: event.target.checked,
                                returnQty: event.target.checked
                                  ? Math.max(1, current.returnQty)
                                  : 0,
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{item.assetName}</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {item.assetCode}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{item.approvedQty}</TableCell>
                        <TableCell className="text-center">{item.returnedQty}</TableCell>
                        <TableCell className="text-center">{item.remainingQty}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            max={item.remainingQty}
                            value={item.returnQty || ""}
                            disabled={!item.selected}
                            onChange={(event) =>
                              updateItem(item.borrowRequestItemId, (current) => {
                                const nextQty = Number(event.target.value);

                                return {
                                  ...current,
                                  returnQty: Number.isFinite(nextQty)
                                    ? Math.max(1, Math.min(current.remainingQty, nextQty))
                                    : current.returnQty,
                                };
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Combobox
                            value={item.condition}
                            disabled={!item.selected}
                            onChange={(value) =>
                              updateItem(item.borrowRequestItemId, (current) => ({
                                ...current,
                                condition: (value || "good") as ReturnFormItem["condition"],
                              }))
                            }
                            options={[
                              { value: "good", label: <StatusBadge type="condition" value="good" />, searchLabel: "สภาพดี" },
                              { value: "damaged", label: <StatusBadge type="condition" value="damaged" />, searchLabel: "ชำรุด" },
                              { value: "lost", label: <StatusBadge type="condition" value="lost" />, searchLabel: "สูญหาย" },
                            ]}
                          />
                        </TableCell>
                        <TableCell>
                          <Textarea
                            rows={2}
                            value={item.note}
                            disabled={!item.selected}
                            onChange={(event) =>
                              updateItem(item.borrowRequestItemId, (current) => ({
                                ...current,
                                note: event.target.value,
                              }))
                            }
                            placeholder="หมายเหตุของรายการนี้"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/returns" className={buttonVariants({ variant: "outline" })}>
              ยกเลิก
            </Link>
            <Button
              type="submit"
              disabled={submitting || activeItems.length === 0 || loadingRequests}
            >
              {submitting ? "กำลังบันทึก..." : "บันทึกการคืน"}
            </Button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-3xl border bg-card px-5 py-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">สรุปรายการคืน</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-muted/70 px-4 py-3">
                <p className="text-xs text-muted-foreground">คำขอที่เลือกได้</p>
                <p className="mt-1 text-2xl font-semibold">
                  {loadingRequests ? "-" : eligibleRequests.length}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/70 px-4 py-3">
                <p className="text-xs text-muted-foreground">รายการที่เลือกคืน</p>
                <p className="mt-1 text-2xl font-semibold">{activeItems.length}</p>
              </div>
              <div className="rounded-2xl bg-muted/70 px-4 py-3">
                <p className="text-xs text-muted-foreground">จำนวนหน่วยรวมที่คืนครั้งนี้</p>
                <p className="mt-1 text-2xl font-semibold">{totalQty}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-card px-5 py-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <PackageCheck className="size-4" />
              แนวทางบันทึกการคืน
            </div>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>เลือกได้เฉพาะคำขอที่อนุมัติแล้วหรืออยู่ในสถานะคืนบางส่วน</li>
              <li>รองรับ partial return โดยระบุจำนวนคืนเฉพาะรายการที่นำมาคืนจริง</li>
              <li>ถ้าสภาพเป็นสูญหาย ระบบจะไม่เพิ่มจำนวนพร้อมใช้งานกลับเข้า stock</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
