import { useI18n } from "@/components/providers/i18n-provider";

type BorrowRequestSummaryProps = {
  itemCount: number;
  totalRequestedQty: number;
};

export function BorrowRequestSummary({
  itemCount,
  totalRequestedQty,
}: BorrowRequestSummaryProps) {
  const { t } = useI18n();

  return (
    <div className="surface-panel surface-section">
      <p className="text-sm font-medium text-muted-foreground">
        {t("borrowRequestNew.labels.requestSummary")}
      </p>
      <div className="mt-4 grid gap-3">
        <div className="rounded-sm border border-border/80 bg-muted/55 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {t("borrowRequestNew.labels.selectedAssets")}
          </p>
          <p className="mt-1 text-2xl font-semibold">{itemCount}</p>
        </div>
        <div className="rounded-sm border border-border/80 bg-muted/55 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {t("borrowRequestNew.labels.totalRequestedQty")}
          </p>
          <p className="mt-1 text-2xl font-semibold">{totalRequestedQty}</p>
        </div>
      </div>
    </div>
  );
}
