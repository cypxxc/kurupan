import { StatusBadge } from "@/components/shared/status-badge";
import { useI18n } from "@/components/providers/i18n-provider";
import type { BorrowRequestDetail } from "@/types/borrow-requests";

import { formatReturnDate } from "@/components/pages/returns-new/return-form-helpers";

type ReturnRequestDetailsProps = {
  request: BorrowRequestDetail;
};

export function ReturnRequestDetails({ request }: ReturnRequestDetailsProps) {
  const { t } = useI18n();

  return (
    <section className="rounded-sm border border-border bg-muted/45 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{request.requestNo}</p>
        <StatusBadge type="borrow" value={request.status} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("returnsNew.requestDetails.borrower", { name: request.borrowerName })} •{" "}
        {t("returnsNew.requestDetails.borrowedOn", {
          date: formatReturnDate(request.startDate),
        })}{" "}
        •{" "}
        {t("returnsNew.requestDetails.due", {
          date: formatReturnDate(request.dueDate),
        })}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {request.purpose ?? t("returnsNew.requestDetails.noPurpose")}
      </p>
    </section>
  );
}
