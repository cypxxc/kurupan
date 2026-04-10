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
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
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
    <div className="rounded-sm border border-border/80 bg-muted/50 px-4 py-3">
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
        const data = await apiClient.get<ReturnTransaction>(`/api/returns/${id}`);
        setTransaction(data);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Unable to load return details."));
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
        <div className="h-[420px] animate-pulse rounded-sm border border-border bg-muted/55" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="empty-state">
        <h1 className="text-xl font-semibold">Return record not found.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Check the selected record and try again.
        </p>
        <Link href="/returns" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>
          Back to returns
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
        Back to returns
      </Link>

      <section className="surface-panel surface-section">
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Return #{transaction.id}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Return details</h1>
          <p className="text-sm text-muted-foreground">
            Borrow request reference {transaction.borrowRequestNo}
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailField label="Borrow request" value={transaction.borrowRequestNo} />
          <DetailField label="Borrower" value={transaction.borrowerName} />
          <DetailField label="Returned at" value={formatDateTime(transaction.returnedAt)} />
          <DetailField label="Received by" value={transaction.receivedByExternalUserId} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <DetailField label="Units returned" value={String(totalQty)} />
          <DetailField label="Transaction note" value={transaction.note ?? "-"} />
        </div>
      </section>

      <section className="table-shell">
        <div className="border-b px-6 py-5">
          <h2 className="text-lg font-semibold">Returned items</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Includes both full and partial returns captured in this transaction.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset code</TableHead>
                <TableHead>Asset name</TableHead>
                <TableHead className="text-center">Return qty</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Note</TableHead>
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
