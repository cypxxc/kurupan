"use client";

import { startTransition, useEffect, useState } from "react";

import { DashboardMetricCard } from "@/components/pages/dashboard/dashboard-metric-card";
import { apiClient } from "@/lib/api-client";
import type { DashboardAsset } from "@/components/pages/dashboard/dashboard-types";

type DashboardAssetStatsPanelProps = {
  assets: DashboardAsset[];
};

const ASSET_SUMMARY_POLL_INTERVAL_MS = 20_000;

export function DashboardAssetStatsPanel({
  assets,
}: DashboardAssetStatsPanelProps) {
  const [liveAssets, setLiveAssets] = useState(assets);

  useEffect(() => {
    let active = true;

    const refreshAssets = async () => {
      try {
        const data = await apiClient.get<
          Array<{
            status: DashboardAsset["status"];
            availableQty: number;
          }>
        >("/api/assets", { cache: "no-store" });

        if (!active) {
          return;
        }

        startTransition(() => {
          setLiveAssets(
            data.map((asset) => ({
              status: asset.status,
              availableQty: asset.availableQty,
            })),
          );
        });
      } catch {
        // Keep the last successful snapshot if the background refresh fails.
      }
    };

    const intervalId = setInterval(() => {
      void refreshAssets();
    }, ASSET_SUMMARY_POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  const availableAssets = liveAssets.filter((asset) => asset.status === "available").length;
  const maintenanceAssets = liveAssets.filter((asset) => asset.status === "maintenance").length;
  const retiredAssets = liveAssets.filter((asset) => asset.status === "retired").length;
  const borrowableAssets = liveAssets.filter(
    (asset) => asset.status === "available" && asset.availableQty > 0,
  ).length;

  return (
    <section className="surface-panel surface-section">
      <h2 className="text-lg font-semibold">Asset summary</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        High-level inventory status for the items currently tracked in the system.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Updates automatically every 20 seconds.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <DashboardMetricCard label="Total assets" value={liveAssets.length} />
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
