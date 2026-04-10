import { Trash2 } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
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
  const { t } = useI18n();

  if (items.length === 0) {
    return (
      <div className="empty-state px-6 py-12">
        <p className="font-medium">{t("borrowRequestNew.help.selectedEmptyTitle")}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("borrowRequestNew.help.selectedEmptyDescription")}
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
              <TableHead>{t("borrowRequestNew.labels.code")}</TableHead>
              <TableHead>{t("borrowRequestNew.labels.asset")}</TableHead>
              <TableHead className="text-center">{t("borrowRequestNew.labels.available")}</TableHead>
              <TableHead className="w-28">{t("borrowRequestNew.labels.requested")}</TableHead>
              <TableHead className="text-right">{t("borrowRequestNew.labels.remove")}</TableHead>
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
                      {item.category ?? t("common.placeholders.uncategorized")} /{" "}
                      {item.location ?? t("common.placeholders.unspecifiedLocation")}
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
                      {t("borrowRequestNew.actions.remove")}
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
