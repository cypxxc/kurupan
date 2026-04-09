import Link from "next/link";
import {
  ArrowLeft,
  CircleSlash,
  ClipboardCheck,
  RotateCcw,
  XCircle,
} from "lucide-react";

import { BorrowRequestDetailField } from "@/components/pages/borrow-request-detail/borrow-request-detail-field";
import {
  formatBorrowRequestDate,
  formatBorrowRequestDateTime,
} from "@/components/pages/borrow-request-detail/borrow-request-detail-helpers";
import { OverdueBadge } from "@/components/shared/overdue-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BorrowRequestDetail } from "@/types/borrow-requests";

type BorrowRequestHeaderProps = {
  request: BorrowRequestDetail;
  overdue: boolean;
  canApproveReject: boolean;
  canCancel: boolean;
  canRecordReturn: boolean;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
};

export function BorrowRequestHeader({
  request,
  overdue,
  canApproveReject,
  canCancel,
  canRecordReturn,
  onApprove,
  onReject,
  onCancel,
}: BorrowRequestHeaderProps) {
  return (
    <>
      <Link
        href="/borrow-requests"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
      >
        <ArrowLeft className="size-4" />
        Back to requests
      </Link>

      <section className="surface-panel surface-section">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {request.requestNo}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">Borrow request details</h1>
              <StatusBadge type="borrow" value={request.status} />
              {overdue ? <OverdueBadge /> : null}
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {request.purpose ?? "No purpose provided"}
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
                  Record return
                </Link>
              ) : null}
              {canApproveReject ? (
                <>
                  <button
                    type="button"
                    className={cn(buttonVariants({ variant: "default" }), "gap-2")}
                    onClick={onApprove}
                  >
                    <ClipboardCheck className="size-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    className={cn(buttonVariants({ variant: "destructive" }), "gap-2")}
                    onClick={onReject}
                  >
                    <XCircle className="size-4" />
                    Reject
                  </button>
                </>
              ) : null}
              {canCancel ? (
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
                  onClick={onCancel}
                >
                  <CircleSlash className="size-4" />
                  Cancel request
                </button>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <BorrowRequestDetailField label="Borrower" value={request.borrowerName} />
          <BorrowRequestDetailField
            label="Start date"
            value={formatBorrowRequestDate(request.startDate)}
          />
          <BorrowRequestDetailField
            label="Due date"
            value={formatBorrowRequestDate(request.dueDate)}
          />
          <BorrowRequestDetailField
            label="Created at"
            value={formatBorrowRequestDateTime(request.createdAt)}
          />
        </div>
      </section>
    </>
  );
}
