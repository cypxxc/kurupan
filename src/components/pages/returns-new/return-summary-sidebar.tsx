import { PackageCheck } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";

type ReturnSummarySidebarProps = {
  eligibleRequestCount: number;
  activeItemCount: number;
  totalQty: number;
  loadingRequests: boolean;
};

export function ReturnSummarySidebar({
  eligibleRequestCount,
  activeItemCount,
  totalQty,
  loadingRequests,
}: ReturnSummarySidebarProps) {
  const { t } = useI18n();

  return (
    <aside className="space-y-4">
      <div className="surface-panel surface-section">
        <p className="text-sm font-medium text-muted-foreground">{t("returnsNew.labels.summary")}</p>
        <div className="mt-4 grid gap-3">
          <div className="rounded-sm border border-border/80 bg-muted/55 px-4 py-3">
            <p className="text-xs text-muted-foreground">{t("returnsNew.labels.eligibleRequests")}</p>
            <p className="mt-1 text-2xl font-semibold">
              {loadingRequests ? "-" : eligibleRequestCount}
            </p>
          </div>
          <div className="rounded-sm border border-border/80 bg-muted/55 px-4 py-3">
            <p className="text-xs text-muted-foreground">{t("returnsNew.labels.selectedItems")}</p>
            <p className="mt-1 text-2xl font-semibold">{activeItemCount}</p>
          </div>
          <div className="rounded-sm border border-border/80 bg-muted/55 px-4 py-3">
            <p className="text-xs text-muted-foreground">{t("returnsNew.labels.totalQty")}</p>
            <p className="mt-1 text-2xl font-semibold">{totalQty}</p>
          </div>
        </div>
      </div>

      <div className="surface-panel surface-section">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <PackageCheck className="size-4" />
          {t("returnsNew.labels.guidelines")}
        </div>
        <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li>{t("returnsNew.guidelines.approvedOnly")}</li>
          <li>{t("returnsNew.guidelines.partial")}</li>
          <li>{t("returnsNew.guidelines.lost")}</li>
        </ul>
      </div>
    </aside>
  );
}
