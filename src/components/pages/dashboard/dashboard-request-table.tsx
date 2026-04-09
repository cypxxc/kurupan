import Link from "next/link";

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
import type { DashboardRequest } from "@/components/pages/dashboard/dashboard-types";
import { isBorrowRequestOverdue } from "@/types/borrow-requests";

type DashboardRequestTableProps = {
  title: string;
  description: string;
  requests: DashboardRequest[];
  emptyLabel: string;
  actionHref?: string;
  actionLabel?: string;
  returnTo?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function DashboardRequestTable({
  title,
  description,
  requests,
  emptyLabel,
  actionHref,
  actionLabel,
  returnTo,
}: DashboardRequestTableProps) {
  return (
    <section className="table-shell">
      <div className="flex flex-col gap-3 border-b border-border/70 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request No.</TableHead>
              <TableHead>Borrower</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {emptyLabel}
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => {
                const dueDate =
                  request.dueDate instanceof Date
                    ? request.dueDate.toISOString()
                    : request.dueDate;
                const overdue = isBorrowRequestOverdue(request.status, dueDate);
                const detailHref = returnTo
                  ? `/borrow-requests/${request.id}?returnTo=${encodeURIComponent(returnTo)}`
                  : `/borrow-requests/${request.id}`;

                return (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{request.requestNo}</p>
                        {overdue ? <OverdueBadge className="w-fit" /> : null}
                      </div>
                    </TableCell>
                    <TableCell>{request.borrowerName}</TableCell>
                    <TableCell>{formatDate(dueDate)}</TableCell>
                    <TableCell>
                      <StatusBadge type="borrow" value={request.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Link
                          href={detailHref}
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                          View details
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
    </section>
  );
}
