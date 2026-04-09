import { redirect } from "next/navigation";

import { DashboardAssetStatsPanel } from "@/components/pages/dashboard/dashboard-asset-stats-panel";
import { DashboardMetricCard } from "@/components/pages/dashboard/dashboard-metric-card";
import { DashboardPageFooter } from "@/components/pages/dashboard/dashboard-page-footer";
import { DashboardRequestStatusChart } from "@/components/pages/dashboard/dashboard-request-status-chart";
import { DashboardRequestTable } from "@/components/pages/dashboard/dashboard-request-table";
import { DashboardUserStatsPanel } from "@/components/pages/dashboard/dashboard-user-stats-panel";
import { getCurrentActorFromServer } from "@/lib/server-auth";
import { createAssetStack } from "@/modules/assets/createAssetStack";
import { createBorrowStack } from "@/modules/borrow/createBorrowStack";
import { createUserManagementStack } from "@/modules/users/createUserManagementStack";

export default async function DashboardPage() {
  const actor = await getCurrentActorFromServer();

  if (!actor) {
    redirect("/login");
  }

  const { borrowRequestService } = createBorrowStack();
  const { assetService } = createAssetStack();
  const { userManagementService } = createUserManagementStack();

  const isBorrower = actor.role === "borrower";
  const isAdmin = actor.role === "admin";
  const isStaffOrAdmin = actor.role === "staff" || actor.role === "admin";

  const [requests, assets, users] = await Promise.all([
    borrowRequestService.listBorrowRequests(actor, {}),
    isStaffOrAdmin
      ? assetService.listAssets({ search: "", category: "", location: "" })
      : Promise.resolve([]),
    isAdmin
      ? userManagementService.listUsers(actor, { search: "", isActive: undefined })
      : Promise.resolve([]),
  ]);

  const myActiveBorrows = requests.filter(
    (request) => request.status === "approved" || request.status === "partially_returned",
  );
  const pendingRequests = requests.filter((request) => request.status === "pending");
  const activeBorrows = requests.filter(
    (request) => request.status === "approved" || request.status === "partially_returned",
  );
  const latestRequestStatus = requests[0]?.status ?? "-";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
      </div>

      {isBorrower ? (
        <section className="grid gap-3 md:grid-cols-3">
          <DashboardMetricCard label="Total requests" value={requests.length} />
          <DashboardMetricCard
            label="Currently borrowed"
            value={myActiveBorrows.length}
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
          <DashboardMetricCard label="Total assets" value={assets.length} />
          <DashboardMetricCard label="Pending requests" value={pendingRequests.length} tone="amber" />
          <DashboardMetricCard label="Active borrows" value={activeBorrows.length} tone="sky" />
        </section>
      )}

      <DashboardRequestStatusChart requests={requests} />

      {isBorrower ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <DashboardRequestTable
            title="Recent requests"
            description="Your latest borrow requests and their current status."
            requests={requests.slice(0, 5)}
            emptyLabel="No borrow requests found."
          />
          <DashboardRequestTable
            title="Items currently borrowed"
            description="Approved requests that are still waiting for full return."
            requests={myActiveBorrows}
            emptyLabel="No active borrow records."
          />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <DashboardRequestTable
            title="Pending review"
            description="Latest requests that are waiting for approval."
            requests={pendingRequests.slice(0, 5)}
            emptyLabel="No pending requests."
            actionHref="/borrow-requests"
            actionLabel="View all"
            returnTo="/dashboard"
          />
          <DashboardAssetStatsPanel assets={assets} />
        </div>
      )}

      {isStaffOrAdmin ? (
        <DashboardRequestTable
          title="Active borrow records"
          description="Requests that are approved and still in progress."
          requests={activeBorrows.slice(0, 8)}
          emptyLabel="No active borrow records."
        />
      ) : null}

      {isAdmin ? <DashboardUserStatsPanel users={users} /> : null}

      <DashboardPageFooter />
    </div>
  );
}
