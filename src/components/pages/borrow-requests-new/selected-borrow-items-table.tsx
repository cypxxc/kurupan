import { Trash2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { BorrowRequestFormItem } from "@/types/borrow-requests";

type SelectedBorrowItemsTableProps = {
  items: BorrowRequestFormItem[];
  onQtyChange: (assetId: number, value: string) => void;
  onRemove: (assetId: number) => void;
};

export function SelectedBorrowItemsTable({
  items,
  onQtyChange,
  onRemove,
}: SelectedBorrowItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="empty-state px-6 py-12">
        <p className="font-medium">No assets selected yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick items from the asset list on the right to build the request.
        </p>
      </div>
    );
  }

  return (
    <div className="table-shell">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead className="text-center">Available</TableHead>
              <TableHead className="w-28">Requested</TableHead>
              <TableHead className="text-right">Remove</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.assetId}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {item.assetCode}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">{item.assetName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category ?? "Uncategorized"} / {item.location ?? "No location"}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-center">{item.availableQty}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    max={item.availableQty}
                    value={item.requestedQty}
                    onChange={(event) => onQtyChange(item.assetId, event.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "gap-1 text-destructive hover:text-destructive",
                      )}
                      onClick={() => onRemove(item.assetId)}
                    >
                      <Trash2 className="size-4" />
                      Remove
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
