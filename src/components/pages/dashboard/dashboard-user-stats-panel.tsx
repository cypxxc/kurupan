import { DashboardMetricCard } from "@/components/pages/dashboard/dashboard-metric-card";
import type { ManagedUser } from "@/types/users";

type DashboardUserStatsPanelProps = {
  users: ManagedUser[];
};

export function DashboardUserStatsPanel({
  users,
}: DashboardUserStatsPanelProps) {
  const activeUsers = users.filter((item) => item.isActive).length;
  const inactiveUsers = users.filter((item) => !item.isActive).length;
  const adminUsers = users.filter((item) => item.role === "admin").length;
  const staffUsers = users.filter((item) => item.role === "staff").length;

  return (
    <section className="surface-panel surface-section">
      <h2 className="text-lg font-semibold">User summary</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Overview of access and account status across the workspace.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <DashboardMetricCard label="Total users" value={users.length} />
        <DashboardMetricCard label="Active users" value={activeUsers} tone="emerald" />
        <DashboardMetricCard label="Staff accounts" value={staffUsers} tone="sky" />
        <DashboardMetricCard label="Admin accounts" value={adminUsers} tone="amber" />
      </div>
      {inactiveUsers > 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Inactive accounts: {inactiveUsers}
        </p>
      ) : null}
    </section>
  );
}
