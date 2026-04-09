import { StatusBadge } from "@/components/shared/status-badge";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { ReturnFormItem } from "@/types/returns";

type ReturnItemsTableProps = {
  items: ReturnFormItem[];
  loading: boolean;
  hasSelection: boolean;
  onItemChange: (
    borrowRequestItemId: number,
    updater: (item: ReturnFormItem) => ReturnFormItem,
  ) => void;
};

export function ReturnItemsTable({
  items,
  loading,
  hasSelection,
  onItemChange,
}: ReturnItemsTableProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Outstanding items</h2>
        <p className="text-sm text-muted-foreground">
          Supports partial returns by selecting only the items being returned in this step.
        </p>
      </div>

      <div className="table-shell shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Select</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead className="text-center">Approved</TableHead>
              <TableHead className="text-center">Returned</TableHead>
              <TableHead className="text-center">Remaining</TableHead>
              <TableHead className="w-28">This return</TableHead>
              <TableHead className="w-40">Condition</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  Loading returnable items...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  {hasSelection
                    ? "This request has no remaining items to return."
                    : "Choose a borrow request to view returnable items."}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.borrowRequestItemId}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(event) =>
                        onItemChange(item.borrowRequestItemId, (current) => ({
                          ...current,
                          selected: event.target.checked,
                          returnQty: event.target.checked ? Math.max(1, current.returnQty) : 0,
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{item.assetName}</p>
                      <p className="font-mono text-xs text-muted-foreground">{item.assetCode}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{item.approvedQty}</TableCell>
                  <TableCell className="text-center">{item.returnedQty}</TableCell>
                  <TableCell className="text-center">{item.remainingQty}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      max={item.remainingQty}
                      value={item.returnQty || ""}
                      disabled={!item.selected}
                      onChange={(event) =>
                        onItemChange(item.borrowRequestItemId, (current) => {
                          const nextQty = Number(event.target.value);

                          return {
                            ...current,
                            returnQty: Number.isFinite(nextQty)
                              ? Math.max(1, Math.min(current.remainingQty, nextQty))
                              : current.returnQty,
                          };
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Combobox
                      value={item.condition}
                      disabled={!item.selected}
                      onChange={(value) =>
                        onItemChange(item.borrowRequestItemId, (current) => ({
                          ...current,
                          condition: (value || "good") as ReturnFormItem["condition"],
                        }))
                      }
                      options={[
                        {
                          value: "good",
                          label: <StatusBadge type="condition" value="good" />,
                          searchLabel: "Good",
                        },
                        {
                          value: "damaged",
                          label: <StatusBadge type="condition" value="damaged" />,
                          searchLabel: "Damaged",
                        },
                        {
                          value: "lost",
                          label: <StatusBadge type="condition" value="lost" />,
                          searchLabel: "Lost",
                        },
                      ]}
                    />
                  </TableCell>
                  <TableCell>
                    <Textarea
                      rows={2}
                      value={item.note}
                      disabled={!item.selected}
                      onChange={(event) =>
                        onItemChange(item.borrowRequestItemId, (current) => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                      placeholder="Optional note for this item"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
