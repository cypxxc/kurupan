"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CircleSlash,
  ClipboardCheck,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { BorrowRequestActionDialog } from "@/components/shared/borrow-request-action-dialog";
import { OverdueBadge } from "@/components/shared/overdue-badge";
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
import type { HistoryEvent } from "@/types/history";
import {
  isBorrowRequestOverdue,
  type BorrowRequestDetail,
} from "@/types/borrow-requests";

type DialogAction = "approve" | "reject" | "cancel" | null;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

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

export default function BorrowRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [request, setRequest] = useState<BorrowRequestDetail | null>(null);
  const [timeline, setTimeline] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [dialogAction, setDialogAction] = useState<DialogAction>(null);
  const [submitting, setSubmitting] = useState(false);

  const canStaffManage = user?.role === "staff" || user?.role === "admin";

  useEffect(() => {
    async function loadRequest() {
      setLoading(true);

      try {
        const response = await fetch(`/api/borrow-requests/${id}`);
        const result = (await response.json()) as
          | { success: true; data: BorrowRequestDetail }
          | { success: false; error?: { message?: string } };

        if (!result.success) {
          toast.error(result.error?.message ?? "ไม่สามารถโหลดคำขอยืมได้");
          setRequest(null);
          return;
        }

        setRequest(result.data);
      } catch {
        toast.error("เกิดข้อผิดพลาดระหว่างโหลดคำขอ");
        setRequest(null);
      } finally {
        setLoading(false);
      }
    }

    async function loadTimeline() {
      setLoadingTimeline(true);

      try {
        const params = new URLSearchParams({
          entityType: "borrow_request",
          entityId: id,
        });
        const response = await fetch(`/api/history?${params.toString()}`);
        const result = (await response.json()) as
          | { success: true; data: HistoryEvent[] }
          | { success: false; error?: { message?: string } };

        if (!result.success) {
          setTimeline([]);
          return;
        }

        setTimeline(result.data);
      } catch {
        setTimeline([]);
      } finally {
        setLoadingTimeline(false);
      }
    }

    void Promise.all([loadRequest(), loadTimeline()]);
  }, [id]);

  const canApproveReject = canStaffManage && request?.status === "pending";
  const canCancel =
    request?.status === "pending" &&
    (!!canStaffManage || request?.borrowerExternalUserId === user?.externalUserId);
  const canRecordReturn =
    canStaffManage &&
    (request?.status === "approved" || request?.status === "partially_returned");

  const overdue = useMemo(() => {
    if (!request) {
      return false;
    }

    return isBorrowRequestOverdue(request.status, request.dueDate);
  }, [request]);

  const handleAction = async (reason: string) => {
    if (!request || !dialogAction) {
      return;
    }

    setSubmitting(true);

    const body =
      dialogAction === "reject"
        ? { rejectionReason: reason }
        : dialogAction === "cancel"
          ? { cancelReason: reason }
          : undefined;

    try {
      const response = await fetch(
        `/api/borrow-requests/${request.id}/${dialogAction}`,
        {
          method: "POST",
          headers: body
            ? {
                "Content-Type": "application/json",
              }
            : undefined,
          body: body ? JSON.stringify(body) : undefined,
        },
      );

      const result = (await response.json()) as
        | { success: true; data: BorrowRequestDetail }
        | { success: false; error?: { message?: string } };

      if (!result.success) {
        toast.error(result.error?.message ?? "ไม่สามารถดำเนินการคำขอนี้ได้");
        return;
      }

      setRequest(result.data);
      setDialogAction(null);
      toast.success("อัปเดตสถานะคำขอเรียบร้อยแล้ว");

      const timelineResponse = await fetch(
        `/api/history?entityType=borrow_request&entityId=${request.id}`,
      );
      const timelineResult = (await timelineResponse.json()) as
        | { success: true; data: HistoryEvent[] }
        | { success: false };
      if (timelineResult.success) {
        setTimeline(timelineResult.data);
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดระหว่างดำเนินการ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="rounded-3xl border bg-card px-6 py-6">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="rounded-3xl border bg-card px-6 py-14 text-center">
        <h1 className="text-xl font-semibold">ไม่พบคำขอยืม</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          อาจไม่มีคำขอนี้อยู่ในระบบหรือคุณไม่มีสิทธิ์เข้าดู
        </p>
        <Link
          href="/borrow-requests"
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
        href="/borrow-requests"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
      >
        <ArrowLeft className="size-4" />
        กลับไปหน้ารายการคำขอ
      </Link>

      <section className="rounded-3xl border bg-card px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {request.requestNo}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                รายละเอียดคำขอยืม
              </h1>
              <StatusBadge type="borrow" value={request.status} />
              {overdue ? <OverdueBadge /> : null}
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {request.purpose ?? "ไม่มีการระบุวัตถุประสงค์"}
            </p>
          </div>

          {(canApproveReject || canCancel || canRecordReturn) && (
            <div className="flex flex-wrap gap-2">
              {canRecordReturn ? (
                <Link
                  href={`/returns/new?borrowRequestId=${request.id}`}
                  className={cn(buttonVariants({ variant: "secondary" }), "gap-2")}
                >
                  <RotateCcw className="size-4" />
                  บันทึกการคืน
                </Link>
              ) : null}
              {canApproveReject ? (
                <>
                  <button
                    type="button"
                    className={cn(buttonVariants({ variant: "default" }), "gap-2")}
                    onClick={() => setDialogAction("approve")}
                  >
                    <ClipboardCheck className="size-4" />
                    อนุมัติ
                  </button>
                  <button
                    type="button"
                    className={cn(buttonVariants({ variant: "destructive" }), "gap-2")}
                    onClick={() => setDialogAction("reject")}
                  >
                    <XCircle className="size-4" />
                    ปฏิเสธ
                  </button>
                </>
              ) : null}
              {canCancel ? (
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
                  onClick={() => setDialogAction("cancel")}
                >
                  <CircleSlash className="size-4" />
                  ยกเลิกคำขอ
                </button>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailField label="ผู้ยืม" value={request.borrowerName} />
          <DetailField label="วันที่ยืม" value={formatDate(request.startDate)} />
          <DetailField label="กำหนดคืน" value={formatDate(request.dueDate)} />
          <DetailField label="วันที่สร้างคำขอ" value={formatDateTime(request.createdAt)} />
        </div>
      </section>

      <section className="rounded-3xl border bg-card px-6 py-6 shadow-sm">
        <h2 className="text-lg font-semibold">รายการที่ขอ</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          แสดงจำนวนที่ขอและจำนวนที่อนุมัติของครุภัณฑ์แต่ละรายการ
        </p>
        <div className="mt-5 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัสครุภัณฑ์</TableHead>
                <TableHead>ชื่อครุภัณฑ์</TableHead>
                <TableHead className="text-center">จำนวนที่ขอ</TableHead>
                <TableHead className="text-center">จำนวนที่อนุมัติ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {request.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.assetCode}
                  </TableCell>
                  <TableCell>{item.assetName}</TableCell>
                  <TableCell className="text-center">{item.requestedQty}</TableCell>
                  <TableCell className="text-center">
                    {item.approvedQty ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border bg-card px-6 py-6 shadow-sm">
          <h2 className="text-lg font-semibold">ผลการดำเนินการ</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <DetailField
              label="อนุมัติโดย"
              value={request.approvedByExternalUserId ?? "-"}
            />
            <DetailField
              label="วันที่อนุมัติ"
              value={formatDateTime(request.approvedAt)}
            />
            <DetailField
              label="ปฏิเสธโดย"
              value={request.rejectedByExternalUserId ?? "-"}
            />
            <DetailField
              label="วันที่ปฏิเสธ"
              value={formatDateTime(request.rejectedAt)}
            />
          </div>
        </div>

        <div className="rounded-3xl border bg-card px-6 py-6 shadow-sm">
          <h2 className="text-lg font-semibold">หมายเหตุคำขอ</h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl bg-muted/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">เหตุผลที่ปฏิเสธ</p>
              <p className="mt-1 font-medium">{request.rejectionReason ?? "-"}</p>
            </div>
            <div className="rounded-2xl bg-muted/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">เหตุผลที่ยกเลิก</p>
              <p className="mt-1 font-medium">{request.cancelReason ?? "-"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-card px-6 py-6 shadow-sm">
        <h2 className="text-lg font-semibold">Timeline / Activity log</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          เหตุการณ์ที่เกิดขึ้นกับคำขอยืมรายการนี้ตามลำดับเวลา
        </p>
        <div className="mt-5 space-y-3">
          {loadingTimeline ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-muted" />
            ))
          ) : timeline.length === 0 ? (
            <div className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              ยังไม่มี activity log สำหรับคำขอนี้
            </div>
          ) : (
            timeline.map((event) => (
              <div key={event.id} className="rounded-2xl border bg-muted/40 px-4 py-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium">{event.summary}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {event.actorName ?? event.actorExternalUserId ?? "system"} /{" "}
                      {event.reference}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(event.occurredAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <BorrowRequestActionDialog
        open={dialogAction !== null}
        action={dialogAction}
        requestNo={request.requestNo}
        onOpenChange={(open) => {
          if (!open) {
            setDialogAction(null);
          }
        }}
        onConfirm={handleAction}
        submitting={submitting}
      />
    </div>
  );
}
