import { DashboardMetricCard } from "@/components/pages/dashboard/dashboard-metric-card";
import type { DashboardUserSummary } from "@/components/pages/dashboard/dashboard-types";

type DashboardUserStatsPanelProps = {
  summary: DashboardUserSummary;
};

export function DashboardUserStatsPanel({
  summary,
}: DashboardUserStatsPanelProps) {
  return (
    <section className="surface-panel surface-section">
      <h2 className="text-lg font-semibold">User summary</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Overview of access and account status across the workspace.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <DashboardMetricCard label="Total users" value={summary.totalUsers} />
        <DashboardMetricCard label="Active users" value={summary.activeUsers} tone="emerald" />
        <DashboardMetricCard label="Staff accounts" value={summary.staffUsers} tone="sky" />
        <DashboardMetricCard label="Admin accounts" value={summary.adminUsers} tone="amber" />
      </div>
      {summary.inactiveUsers > 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Inactive accounts: {summary.inactiveUsers}
        </p>
      ) : null}
    </section>
  );
}
