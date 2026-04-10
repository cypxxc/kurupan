"use client";

import { startTransition, useEffect, useState } from "react";

import { DashboardMetricCard } from "@/components/pages/dashboard/dashboard-metric-card";
import { apiClient } from "@/lib/api-client";
import type { DashboardAssetSummary } from "@/components/pages/dashboard/dashboard-types";

type DashboardAssetStatsPanelProps = {
  summary: DashboardAssetSummary;
};

const ASSET_SUMMARY_POLL_INTERVAL_MS = 20_000;

export function DashboardAssetStatsPanel({
  summary,
}: DashboardAssetStatsPanelProps) {
  const [liveSummary, setLiveSummary] = useState(summary);

  useEffect(() => {
    let active = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const refreshAssets = async () => {
      if (document.hidden) return;

      try {
        const data = await apiClient.get<DashboardAssetSummary>("/api/assets/summary", {
          cache: "no-store",
        });

        if (!active) return;

        startTransition(() => {
          setLiveSummary(data);
        });
      } catch {
        // Keep the last successful snapshot if the background refresh fails.
      }
    };

    const startPolling = () => {
      if (intervalId !== null) return;
      intervalId = setInterval(() => void refreshAssets(), ASSET_SUMMARY_POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalId === null) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        void refreshAssets();
        startPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startPolling();

    return () => {
      active = false;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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
        <DashboardMetricCard label="Total assets" value={liveSummary.totalAssets} />
        <DashboardMetricCard
          label="Ready to borrow"
          value={liveSummary.borrowableAssets}
          tone="emerald"
        />
        <DashboardMetricCard
          label="Available items"
          value={liveSummary.availableAssets}
          tone="sky"
        />
        <DashboardMetricCard
          label="In maintenance"
          value={liveSummary.maintenanceAssets}
          tone="amber"
        />
      </div>
      {liveSummary.retiredAssets > 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Retired items: {liveSummary.retiredAssets}
        </p>
      ) : null}
    </section>
  );
}
