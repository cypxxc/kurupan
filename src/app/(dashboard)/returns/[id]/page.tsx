import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

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
import { getCurrentActorFromServer } from "@/lib/server-auth";
import { createReturnStack } from "@/modules/returns/createReturnStack";

type ReturnDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border/80 bg-muted/50 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

export default async function ReturnDetailPage({ params }: ReturnDetailPageProps) {
  const actor = await getCurrentActorFromServer();

  if (!actor) {
    redirect("/login");
  }

  const { id } = await params;
  const returnId = Number(id);

  if (!Number.isInteger(returnId) || returnId < 1) {
    notFound();
  }

  const { returnService } = createReturnStack();
  let transaction;

  try {
    transaction = await returnService.getReturnById(actor, returnId);
  } catch {
    notFound();
  }

  const totalQty = transaction.items.reduce((sum, item) => sum + item.returnQty, 0);

  return (
    <div className="space-y-6">
      <Link
        href="/returns"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
      >
        <ArrowLeft className="size-4" />
        กลับหน้ารายการคืน
      </Link>

      <section className="surface-panel surface-section">
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Return #{transaction.id}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">รายละเอียดการคืน</h1>
          <p className="text-sm text-muted-foreground">
            อ้างอิงคำขอยืม {transaction.borrowRequestNo}
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailField label="คำขอยืม" value={transaction.borrowRequestNo} />
          <DetailField label="ผู้ยืม" value={transaction.borrowerName} />
          <DetailField label="รับคืนเมื่อ" value={formatDateTime(transaction.returnedAt)} />
          <DetailField label="ผู้รับคืน" value={transaction.receivedByExternalUserId} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <DetailField label="จำนวนหน่วยที่คืน" value={String(totalQty)} />
          <DetailField label="หมายเหตุ" value={transaction.note ?? "-"} />
        </div>
      </section>

      <section className="table-shell">
        <div className="border-b px-6 py-5">
          <h2 className="text-lg font-semibold">รายการที่คืน</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            รายการที่บันทึกในธุรกรรมนี้ รวมทั้งการคืนเต็มและบางส่วน
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
