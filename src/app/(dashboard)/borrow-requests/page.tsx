"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";

import { BorrowRequestStatusTabs } from "@/components/shared/borrow-request-status-tabs";
import { BorrowRequestDataTable } from "@/components/tables/borrow-request-data-table";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import type {
  BorrowRequest,
  BorrowRequestStatus,
} from "@/types/borrow-requests";

export default function BorrowRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | BorrowRequestStatus>("all");

  const isBorrower = user?.role === "borrower";

  const fetchRequests = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }

    try {
      const response = await fetch(`/api/borrow-requests?${params.toString()}`);
      const result = (await response.json()) as
        | { success: true; data: BorrowRequest[] }
        | { success: false; error?: { message?: string } };

      if (!result.success) {
        toast.error(result.error?.message ?? "ไม่สามารถโหลดคำขอยืมได้");
        setRequests([]);
        return;
      }

      setRequests(result.data);
    } catch {
      toast.error("เกิดข้อผิดพลาดระหว่างโหลดคำขอยืม");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === "pending").length,
    [requests],
  );
  const activeCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === "approved" || request.status === "partially_returned",
      ).length,
    [requests],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Borrow Requests</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">คำขอยืม</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {isBorrower
                ? "ติดตามคำขอยืมของคุณ ตรวจสอบสถานะ และเปิดดูรายละเอียดแต่ละคำขอ"
                : "ดูคำขอยืมทั้งหมด ตรวจสอบรายการที่รออนุมัติ และเปิดดูรายละเอียดเพื่อดำเนินการ"}
            </p>
          </div>
        </div>
        <Link
          href="/borrow-requests/new"
          className={cn(buttonVariants({ variant: "default" }), "gap-2")}
        >
          <Plus className="size-4" />
          สร้างคำขอยืม
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">
            {isBorrower ? "คำขอของฉัน" : "คำขอทั้งหมด"}
          </p>
          <p className="mt-2 text-3xl font-semibold">{requests.length}</p>
        </div>
        <div className="rounded-3xl border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">รออนุมัติ</p>
          <p className="mt-2 text-3xl font-semibold text-amber-600 dark:text-amber-400">
            {pendingCount}
          </p>
        </div>
        <div className="rounded-3xl border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">กำลังยืมอยู่</p>
          <p className="mt-2 text-3xl font-semibold text-sky-600 dark:text-sky-400">
            {activeCount}
          </p>
        </div>
      </div>

      <section className="rounded-3xl border bg-card px-5 py-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ClipboardList className="size-4" />
          กรองตามสถานะ
        </div>
        <div className="mt-4">
          <BorrowRequestStatusTabs
            value={statusFilter}
            onValueChange={setStatusFilter}
          />
        </div>
      </section>

      <BorrowRequestDataTable
        key={statusFilter}
        requests={requests}
        loading={loading}
        isBorrower={Boolean(isBorrower)}
      />
    </div>
  );
}
