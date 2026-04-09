import { BorrowRequestDetailField } from "@/components/pages/borrow-request-detail/borrow-request-detail-field";
import { formatBorrowRequestDateTime } from "@/components/pages/borrow-request-detail/borrow-request-detail-helpers";
import type { BorrowRequestDetail } from "@/types/borrow-requests";

type BorrowRequestOutcomeCardProps = {
  request: BorrowRequestDetail;
};

export function BorrowRequestOutcomeCard({
  request,
}: BorrowRequestOutcomeCardProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="surface-panel surface-section">
        <h2 className="text-lg font-semibold">Processing details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <BorrowRequestDetailField
            label="Approved by"
            value={request.approvedByExternalUserId ?? "-"}
          />
          <BorrowRequestDetailField
            label="Approved at"
            value={formatBorrowRequestDateTime(request.approvedAt)}
          />
          <BorrowRequestDetailField
            label="Rejected by"
            value={request.rejectedByExternalUserId ?? "-"}
          />
          <BorrowRequestDetailField
            label="Rejected at"
            value={formatBorrowRequestDateTime(request.rejectedAt)}
          />
        </div>
      </div>

      <div className="surface-panel surface-section">
        <h2 className="text-lg font-semibold">Decision notes</h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-sm border border-border/80 bg-muted/55 px-4 py-3">
            <p className="text-xs text-muted-foreground">Rejection reason</p>
            <p className="mt-1 font-medium">{request.rejectionReason ?? "-"}</p>
          </div>
          <div className="rounded-sm border border-border/80 bg-muted/55 px-4 py-3">
            <p className="text-xs text-muted-foreground">Cancellation reason</p>
            <p className="mt-1 font-medium">{request.cancelReason ?? "-"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
