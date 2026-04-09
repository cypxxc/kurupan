import { StatusBadge } from "@/components/shared/status-badge";
import type { BorrowRequestDetail } from "@/types/borrow-requests";

import { formatReturnDate } from "@/components/pages/returns-new/return-form-helpers";

type ReturnRequestDetailsProps = {
  request: BorrowRequestDetail;
};

export function ReturnRequestDetails({ request }: ReturnRequestDetailsProps) {
  return (
    <section className="rounded-sm border border-border bg-muted/45 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{request.requestNo}</p>
        <StatusBadge type="borrow" value={request.status} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Borrower: {request.borrowerName} • Borrowed on {formatReturnDate(request.startDate)} • Due{" "}
        {formatReturnDate(request.dueDate)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {request.purpose ?? "No purpose provided"}
      </p>
    </section>
  );
}
