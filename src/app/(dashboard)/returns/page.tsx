"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

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
import type { ReturnTransaction } from "@/types/returns";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ReturnsPage() {
  const { user } = useAuth();
  const [returns, setReturns] = useState<ReturnTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const canManage = user?.role === "staff" || user?.role === "admin";

  const fetchReturns = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/returns");
      const result = (await response.json()) as
        | { success: true; data: ReturnTransaction[] }
        | { success: false; error?: { message?: string } };

      if (!result.success) {
        toast.error(result.error?.message ?? "ไม่สามารถโหลดรายการคืนได้");
        setReturns([]);
        return;
      }

      setReturns(result.data);
    } catch {
      toast.error("เกิดข้อผิดพลาดระหว่างโหลดรายการคืน");
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReturns();
  }, [fetchReturns]);

  const totalReturnedQty = useMemo(() => {
    return returns.reduce((sum, transaction) => {
      return (
        sum +
        transaction.items.reduce((transactionSum, item) => transactionSum + item.returnQty, 0)
      );
    }, 0);
  }, [returns]);

  const uniqueRequests = useMemo(() => {
    return new Set(returns.map((transaction) => transaction.borrowRequestId)).size;
  }, [returns]);

  const title = canManage ? "รายการคืน" : "ประวัติการคืนของฉัน";
  const description = canManage
    ? "ติดตามธุรกรรมการคืนทั้งหมด รวมถึงการคืนบางส่วนของคำขอเดียวกัน"
    : "ดูรายการคืนที่อ้างอิงคำขอยืมของคุณแบบอ่านอย่างเดียว";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">การคืน</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {canManage ? (
          <Link
            href="/returns/new"
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <ClipboardCheck className="size-4" />
            บันทึกการคืน
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="metric-tile">
          <p className="text-sm text-muted-foreground">ธุรกรรมคืนทั้งหมด</p>
          <p className="mt-2 text-3xl font-semibold">{returns.length}</p>
        </div>
        <div className="metric-tile">
          <p className="text-sm text-muted-foreground">คำขอที่มีการคืนแล้ว</p>
          <p className="mt-2 text-3xl font-semibold text-sky-600 dark:text-sky-400">
            {uniqueRequests}
          </p>
        </div>
        <div className="metric-tile">
          <p className="text-sm text-muted-foreground">จำนวนหน่วยที่คืนสะสม</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
            {totalReturnedQty}
          </p>
        </div>
      </div>

      <div className="table-shell">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>คำขออ้างอิง</TableHead>
                <TableHead>ผู้ยืม</TableHead>
                <TableHead>รับคืนเมื่อ</TableHead>
                <TableHead>ผู้รับคืน</TableHead>
                <TableHead className="text-center">จำนวนรายการ</TableHead>
                <TableHead>ผลการคืน</TableHead>
                <TableHead className="text-right">การดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><div className="h-4 w-28 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-24 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-32 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-24 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="mx-auto h-4 w-10 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-5 w-20 animate-pulse rounded-full bg-muted" /></TableCell>
                    <TableCell><div className="ml-auto h-7 w-24 animate-pulse rounded bg-muted" /></TableCell>
                  </TableRow>
                ))
              ) : returns.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    ยังไม่มีรายการคืนในระบบ
                  </TableCell>
                </TableRow>
              ) : (
                returns.map((transaction) => {
                  const hasLost = transaction.items.some(
                    (item) => item.condition === "lost",
                  );
                  const hasDamaged = transaction.items.some(
                    (item) => item.condition === "damaged",
                  );
                  const condition =
                    hasLost ? "lost" : hasDamaged ? "damaged" : "good";

                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{transaction.borrowRequestNo}</p>
                          <p className="text-xs text-muted-foreground">
                            รายการคืน #{transaction.id}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{transaction.borrowerName}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(transaction.returnedAt)}
                      </TableCell>
                      <TableCell>{transaction.receivedByExternalUserId}</TableCell>
                      <TableCell className="text-center">
                        {transaction.items.length}
                      </TableCell>
                      <TableCell>
                        <StatusBadge type="condition" value={condition} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Link
                            href={`/returns/${transaction.id}`}
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                          >
                            ดูรายละเอียด
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
