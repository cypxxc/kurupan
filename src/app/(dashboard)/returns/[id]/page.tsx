"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { ReturnTransaction } from "@/types/returns";

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

export default function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [transaction, setTransaction] = useState<ReturnTransaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReturn() {
      setLoading(true);

      try {
        const response = await fetch(`/api/returns/${id}`);
        const result = (await response.json()) as
          | { success: true; data: ReturnTransaction }
          | { success: false; error?: { message?: string } };

        if (!result.success) {
          toast.error(result.error?.message ?? "ไม่สามารถโหลดรายละเอียดการคืนได้");
          setTransaction(null);
          return;
        }

        setTransaction(result.data);
      } catch {
        toast.error("เกิดข้อผิดพลาดระหว่างโหลดรายละเอียดการคืน");
        setTransaction(null);
      } finally {
        setLoading(false);
      }
    }

    void loadReturn();
  }, [id]);

  const totalQty = useMemo(() => {
    if (!transaction) {
      return 0;
    }

    return transaction.items.reduce((sum, item) => sum + item.returnQty, 0);
  }, [transaction]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-[420px] animate-pulse rounded-3xl border bg-muted/60" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="rounded-3xl border bg-card px-6 py-14 text-center">
        <h1 className="text-xl font-semibold">ไม่พบรายการคืน</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ตรวจสอบรายการที่ต้องการเปิดดูอีกครั้ง
        </p>
        <Link
          href="/returns"
          className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
        >
          กลับไปหน้ารายการ
        </Link>
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

      <section className="rounded-3xl border bg-card px-6 py-6 shadow-sm">
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Return #{transaction.id}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">รายละเอียดการคืน</h1>
          <p className="text-sm text-muted-foreground">
            อ้างอิงคำขอ {transaction.borrowRequestNo}
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailField label="คำขออ้างอิง" value={transaction.borrowRequestNo} />
          <DetailField label="ผู้ยืม" value={transaction.borrowerName} />
          <DetailField
            label="รับคืนเมื่อ"
            value={formatDateTime(transaction.returnedAt)}
          />
          <DetailField
            label="ผู้รับคืน"
            value={transaction.receivedByExternalUserId}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <DetailField label="จำนวนหน่วยที่คืน" value={String(totalQty)} />
          <DetailField label="หมายเหตุธุรกรรม" value={transaction.note ?? "-"} />
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="border-b px-6 py-5">
          <h2 className="text-lg font-semibold">รายการที่คืน</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            รองรับทั้งคืนครบและคืนบางส่วนในธุรกรรมเดียว
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัสครุภัณฑ์</TableHead>
                <TableHead>ชื่อครุภัณฑ์</TableHead>
                <TableHead className="text-center">จำนวนที่คืน</TableHead>
                <TableHead>สภาพ</TableHead>
                <TableHead>หมายเหตุ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaction.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.assetCode}
                  </TableCell>
                  <TableCell>{item.assetName}</TableCell>
                  <TableCell className="text-center">{item.returnQty}</TableCell>
                  <TableCell>
                    <StatusBadge type="condition" value={item.condition} />
                  </TableCell>
                  <TableCell>{item.note ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
