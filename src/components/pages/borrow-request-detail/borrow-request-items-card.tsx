import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import type { BorrowRequestDetail } from "@/types/borrow-requests";

export type BorrowRequestApprovalItem = {
  borrowRequestItemId: number;
  selected: boolean;
  approvedQty: number;
};

type BorrowRequestItemsCardProps = {
  request: BorrowRequestDetail;
  editable?: boolean;
  approvalItems?: BorrowRequestApprovalItem[];
  onApprovalItemChange?: (
    borrowRequestItemId: number,
    updater: (item: BorrowRequestApprovalItem) => BorrowRequestApprovalItem,
  ) => void;
  onToggleAll?: (checked: boolean) => void;
};

export function BorrowRequestItemsCard({
  request,
  editable = false,
  approvalItems = [],
  onApprovalItemChange,
  onToggleAll,
}: BorrowRequestItemsCardProps) {
  const approvalMap = new Map(
    approvalItems.map((item) => [item.borrowRequestItemId, item]),
  );
  const selectableCount = approvalItems.length;
  const selectedCount = approvalItems.filter((item) => item.selected).length;
  const allSelected = selectableCount > 0 && selectedCount === selectableCount;

  return (
    <section className="surface-panel surface-section">
      <h2 className="text-lg font-semibold">Requested items</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {editable
          ? "Tick the items you want to approve, then adjust quantity if needed before approving."
          : "Requested and approved quantities for each asset in this request."}
      </p>
      <div className="mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {editable ? (
                <TableHead className="w-20 text-center">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      aria-label="Select all items"
                      onChange={(event) => onToggleAll?.(event.target.checked)}
                    />
                  </div>
                </TableHead>
              ) : null}
              <TableHead>Asset code</TableHead>
              <TableHead>Asset name</TableHead>
              <TableHead className="text-center">Requested</TableHead>
              <TableHead className="text-center">In stock</TableHead>
              {editable ? (
                <TableHead className="w-32 text-center">Approve qty</TableHead>
              ) : null}
              <TableHead className="text-center">Approved</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {request.items.map((item) => {
              const approval = approvalMap.get(item.id);
              const approvedPreview = editable
                ? approval?.selected
                  ? approval.approvedQty
                  : 0
                : item.approvedQty;

              return (
                <TableRow key={item.id}>
                  {editable ? (
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={approval?.selected ?? false}
                        aria-label={`Select ${item.assetName}`}
                        onChange={(event) =>
                          onApprovalItemChange?.(item.id, (current) => ({
                            ...current,
                            selected: event.target.checked,
                            approvedQty: event.target.checked
                              ? Math.max(1, current.approvedQty || item.requestedQty)
                              : current.approvedQty,
                          }))
                        }
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.assetCode}
                  </TableCell>
                  <TableCell>{item.assetName}</TableCell>
                  <TableCell className="text-center">{item.requestedQty}</TableCell>
                  <TableCell className="text-center">{item.availableQty}</TableCell>
                  {editable ? (
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        max={item.requestedQty}
                        step={1}
                        value={String(approval?.approvedQty ?? item.requestedQty)}
                        disabled={!approval?.selected}
                        onChange={(event) =>
                          onApprovalItemChange?.(item.id, (current) => {
                            const nextQty = Number(event.target.value);

                            return {
                              ...current,
                              approvedQty: Number.isFinite(nextQty)
                                ? Math.max(1, Math.min(item.requestedQty, Math.trunc(nextQty)))
                                : current.approvedQty,
                            };
                          })
                        }
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="text-center">{approvedPreview ?? "-"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
