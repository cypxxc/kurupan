import { redirect } from "next/navigation";

import { DashboardAssetStatsPanel } from "@/components/pages/dashboard/dashboard-asset-stats-panel";
import { DashboardMetricCard } from "@/components/pages/dashboard/dashboard-metric-card";
import { DashboardPageFooter } from "@/components/pages/dashboard/dashboard-page-footer";
import { DashboardRequestStatusChart } from "@/components/pages/dashboard/dashboard-request-status-chart";
import { DashboardRequestTable } from "@/components/pages/dashboard/dashboard-request-table";
import { DashboardUserStatsPanel } from "@/components/pages/dashboard/dashboard-user-stats-panel";
import { measureAsyncOperation } from "@/lib/performance";
import { getCurrentActorFromServer } from "@/lib/server-auth";
import {
  getCachedBorrowerDashboardData,
  getCachedStaffOrAdminDashboardData,
} from "@/modules/dashboard/dashboard-cache";
import type { BorrowRequestStatus } from "@/types/borrow-requests";

function sumRequestCounts(counts: Record<BorrowRequestStatus, number>) {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

export default async function DashboardPage() {
  const actor = await measureAsyncOperation("dashboard.resolveActor", () =>
    getCurrentActorFromServer(),
  );

  if (!actor) {
    redirect("/login");
  }

  const isBorrower = actor.role === "borrower";
  const isAdmin = actor.role === "admin";
  const isStaffOrAdmin = actor.role === "staff" || actor.role === "admin";
  const staffOrAdminRole =
    actor.role === "staff" ? "staff" : actor.role === "admin" ? "admin" : null;
  const borrowerDashboardData = isBorrower
    ? await getCachedBorrowerDashboardData(actor.externalUserId)
    : null;
  const staffOrAdminDashboardData = staffOrAdminRole
    ? await getCachedStaffOrAdminDashboardData(staffOrAdminRole)
    : null;

  const requestStatusCounts =
    borrowerDashboardData?.requestStatusCounts ??
    staffOrAdminDashboardData?.requestStatusCounts ??
    {
      pending: 0,
      approved: 0,
      partially_approved: 0,
      rejected: 0,
      cancelled: 0,
      partially_returned: 0,
      returned: 0,
    };
  const recentRequests = borrowerDashboardData?.recentRequests ?? [];
  const borrowerActiveRequests = borrowerDashboardData?.activeBorrowRequests ?? [];
  const pendingRequests = staffOrAdminDashboardData?.pendingRequests ?? [];
  const activeBorrowRequests = staffOrAdminDashboardData?.activeBorrowRequests ?? [];
  const assetSummary = staffOrAdminDashboardData?.assetSummary ?? null;
  const userSummary = staffOrAdminDashboardData?.userSummary ?? null;

  const totalRequests = sumRequestCounts(requestStatusCounts);
  const activeBorrowCount =
    requestStatusCounts.approved +
    requestStatusCounts.partially_approved +
    requestStatusCounts.partially_returned;
  const latestRequestStatus = recentRequests[0]?.status ?? "-";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
      </div>

      {isBorrower ? (
        <section className="grid gap-3 md:grid-cols-3">
          <DashboardMetricCard label="Total requests" value={totalRequests} />
          <DashboardMetricCard
            label="Currently borrowed"
            value={activeBorrowCount}
            tone="sky"
          />
          <DashboardMetricCard
            label="Latest request status"
            value={latestRequestStatus}
            tone="amber"
          />
        </section>
      ) : (
        <section className="grid gap-3 md:grid-cols-3">
          <DashboardMetricCard label="Total assets" value={assetSummary?.totalAssets ?? 0} />
          <DashboardMetricCard
            label="Pending requests"
            value={requestStatusCounts.pending}
            tone="amber"
          />
          <DashboardMetricCard label="Active borrows" value={activeBorrowCount} tone="sky" />
        </section>
      )}

      <DashboardRequestStatusChart counts={requestStatusCounts} />

      {isBorrower ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <DashboardRequestTable
            title="Recent requests"
            description="Your latest borrow requests and their current status."
            requests={recentRequests}
            emptyLabel="No borrow requests found."
          />
          <DashboardRequestTable
            title="Items currently borrowed"
            description="Approved requests that are still waiting for full return."
            requests={borrowerActiveRequests}
            emptyLabel="No active borrow records."
          />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <DashboardRequestTable
            title="Pending review"
            description="Latest requests that are waiting for approval."
            requests={pendingRequests}
            emptyLabel="No pending requests."
            actionHref="/borrow-requests"
            actionLabel="View all"
            returnTo="/dashboard"
          />
          {assetSummary ? <DashboardAssetStatsPanel summary={assetSummary} /> : null}
        </div>
      )}

      {isStaffOrAdmin ? (
        <DashboardRequestTable
          title="Active borrow records"
          description="Requests that are approved and still in progress."
          requests={activeBorrowRequests}
          emptyLabel="No active borrow records."
        />
      ) : null}

      {isAdmin && userSummary ? <DashboardUserStatsPanel summary={userSummary} /> : null}

      <DashboardPageFooter />
    </div>
  );
}
