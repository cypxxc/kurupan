import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BorrowRequestDetail } from "@/types/borrow-requests";

type BorrowRequestItemsCardProps = {
  request: BorrowRequestDetail;
};

export function BorrowRequestItemsCard({
  request,
}: BorrowRequestItemsCardProps) {
  return (
    <section className="surface-panel surface-section">
      <h2 className="text-lg font-semibold">Requested items</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Requested and approved quantities for each asset in this request.
      </p>
      <div className="mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset code</TableHead>
              <TableHead>Asset name</TableHead>
              <TableHead className="text-center">Requested</TableHead>
              <TableHead className="text-center">Approved</TableHead>
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
                <TableCell className="text-center">{item.approvedQty ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
