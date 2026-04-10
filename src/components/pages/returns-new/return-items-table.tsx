import { StatusBadge } from "@/components/shared/status-badge";
import { useI18n } from "@/components/providers/i18n-provider";
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
  const { t } = useI18n();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("returnsNew.items.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("returnsNew.items.description")}</p>
      </div>

      <div className="table-shell shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">{t("returnsNew.labels.select")}</TableHead>
              <TableHead>{t("returnsNew.labels.asset")}</TableHead>
              <TableHead className="text-center">{t("returnsNew.labels.approved")}</TableHead>
              <TableHead className="text-center">{t("returnsNew.labels.returned")}</TableHead>
              <TableHead className="text-center">{t("returnsNew.labels.remaining")}</TableHead>
              <TableHead className="w-28">{t("returnsNew.labels.thisReturn")}</TableHead>
              <TableHead className="w-40">{t("returnsNew.labels.condition")}</TableHead>
              <TableHead>{t("returnsNew.labels.itemNote")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  {t("returnsNew.items.loading")}
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  {hasSelection
                    ? t("returnsNew.items.emptySelected")
                    : t("returnsNew.items.emptyUnselected")}
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
                          searchLabel: t("common.statuses.condition.good"),
                        },
                        {
                          value: "damaged",
                          label: <StatusBadge type="condition" value="damaged" />,
                          searchLabel: t("common.statuses.condition.damaged"),
                        },
                        {
                          value: "lost",
                          label: <StatusBadge type="condition" value="lost" />,
                          searchLabel: t("common.statuses.condition.lost"),
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
                      placeholder={t("returnsNew.placeholders.itemNote")}
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
