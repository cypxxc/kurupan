import { PackageCheck } from "lucide-react";

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
  return (
    <aside className="space-y-4">
      <div className="surface-panel surface-section">
        <p className="text-sm font-medium text-muted-foreground">Return summary</p>
        <div className="mt-4 grid gap-3">
          <div className="rounded-sm border border-border/80 bg-muted/55 px-4 py-3">
            <p className="text-xs text-muted-foreground">Eligible requests</p>
            <p className="mt-1 text-2xl font-semibold">
              {loadingRequests ? "-" : eligibleRequestCount}
            </p>
          </div>
          <div className="rounded-sm border border-border/80 bg-muted/55 px-4 py-3">
            <p className="text-xs text-muted-foreground">Selected items</p>
            <p className="mt-1 text-2xl font-semibold">{activeItemCount}</p>
          </div>
          <div className="rounded-sm border border-border/80 bg-muted/55 px-4 py-3">
            <p className="text-xs text-muted-foreground">Total units returned now</p>
            <p className="mt-1 text-2xl font-semibold">{totalQty}</p>
          </div>
        </div>
      </div>

      <div className="surface-panel surface-section">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <PackageCheck className="size-4" />
          Return guidelines
        </div>
        <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li>Only approved or partially returned requests can be processed here.</li>
          <li>Partial returns are supported by selecting only the items brought back now.</li>
          <li>Items marked as lost will not be added back to available stock.</li>
        </ul>
      </div>
    </aside>
  );
}
