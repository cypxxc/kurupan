import { DashboardMetricCard } from "@/components/pages/dashboard/dashboard-metric-card";
import type { DashboardAsset } from "@/components/pages/dashboard/dashboard-types";

type DashboardAssetStatsPanelProps = {
  assets: DashboardAsset[];
};

export function DashboardAssetStatsPanel({
  assets,
}: DashboardAssetStatsPanelProps) {
  const availableAssets = assets.filter((asset) => asset.status === "available").length;
  const maintenanceAssets = assets.filter((asset) => asset.status === "maintenance").length;
  const retiredAssets = assets.filter((asset) => asset.status === "retired").length;
  const borrowableAssets = assets.filter(
    (asset) => asset.status === "available" && asset.availableQty > 0,
  ).length;

  return (
    <section className="surface-panel surface-section">
      <h2 className="text-lg font-semibold">Asset summary</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        High-level inventory status for the items currently tracked in the system.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <DashboardMetricCard label="Total assets" value={assets.length} />
        <DashboardMetricCard label="Ready to borrow" value={borrowableAssets} tone="emerald" />
        <DashboardMetricCard label="Available items" value={availableAssets} tone="sky" />
        <DashboardMetricCard label="In maintenance" value={maintenanceAssets} tone="amber" />
      </div>
      {retiredAssets > 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Retired items: {retiredAssets}</p>
      ) : null}
    </section>
  );
}
