import type { BorrowRequest } from "@/types/borrow-requests";

export type DashboardRequest = {
  id: number;
  requestNo: string;
  borrowerName: string;
  dueDate: string | Date;
  status: BorrowRequest["status"];
};

export type DashboardRequestStatusCounts = Record<BorrowRequest["status"], number>;

export type DashboardAssetSummary = {
  totalAssets: number;
  availableAssets: number;
  maintenanceAssets: number;
  retiredAssets: number;
  borrowableAssets: number;
};

export type DashboardUserSummary = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  staffUsers: number;
};
