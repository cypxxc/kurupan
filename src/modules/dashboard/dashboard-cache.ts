import { revalidateTag, unstable_cache } from "next/cache";

import { measureAsyncOperation } from "@/lib/performance";
import { AssetRepository } from "@/modules/assets/repositories/AssetRepository";
import { BorrowRequestRepository } from "@/modules/borrow/repositories/BorrowRequestRepository";
import { LocalAuthUserRepository } from "@/modules/auth/repositories/LocalAuthUserRepository";
import type { Role } from "@/types/auth";
import type { BorrowRequestStatus } from "@/types/borrow-requests";

const DASHBOARD_BORROW_REVALIDATE_SECONDS = 30;
const DASHBOARD_SUMMARY_REVALIDATE_SECONDS = 60;

export const DASHBOARD_BORROW_TAG = "dashboard:borrow";
export const DASHBOARD_ASSET_TAG = "dashboard:asset";
export const DASHBOARD_USER_TAG = "dashboard:user";

const ACTIVE_REQUEST_STATUSES: BorrowRequestStatus[] = [
  "approved",
  "partially_approved",
  "partially_returned",
];

function createBorrowRequestRepository() {
  return new BorrowRequestRepository();
}

function createAssetRepository() {
  return new AssetRepository();
}

function createLocalAuthUserRepository() {
  return new LocalAuthUserRepository();
}

function getBorrowerFilter(externalUserId: string) {
  return {
    borrowerExternalUserId: externalUserId,
  };
}

const getCachedBorrowerDashboardDataInternal = unstable_cache(
  async (externalUserId: string) =>
    measureAsyncOperation("dashboard.cache.borrowerSnapshot", async () => {
      const borrowRequestRepository = createBorrowRequestRepository();

      const [requestStatusCounts, recentRequests, activeBorrowRequests] = await Promise.all([
        borrowRequestRepository.getStatusCounts(getBorrowerFilter(externalUserId)),
        borrowRequestRepository.findSummaries(getBorrowerFilter(externalUserId), 5),
        borrowRequestRepository.findSummaries(
          {
            ...getBorrowerFilter(externalUserId),
            statuses: ACTIVE_REQUEST_STATUSES,
          },
          5,
        ),
      ]);

      return {
        requestStatusCounts,
        recentRequests,
        activeBorrowRequests,
      };
    }),
  ["dashboard-borrower-snapshot-v1"],
  {
    revalidate: DASHBOARD_BORROW_REVALIDATE_SECONDS,
    tags: [DASHBOARD_BORROW_TAG],
  },
);

const getCachedStaffOrAdminDashboardDataInternal = unstable_cache(
  async (role: Exclude<Role, "borrower">) =>
    measureAsyncOperation("dashboard.cache.staffOrAdminSnapshot", async () => {
      const borrowRequestRepository = createBorrowRequestRepository();
      const assetRepository = createAssetRepository();
      const localAuthUserRepository = createLocalAuthUserRepository();

      const [requestStatusCounts, pendingRequests, activeBorrowRequests, assetSummary, userSummary] =
        await Promise.all([
          borrowRequestRepository.getStatusCounts({}),
          borrowRequestRepository.findSummaries({ status: "pending" }, 5),
          borrowRequestRepository.findSummaries(
            {
              statuses: ACTIVE_REQUEST_STATUSES,
            },
            8,
          ),
          assetRepository.getDashboardSummary(),
          role === "admin" ? localAuthUserRepository.getManagedUserSummary() : Promise.resolve(null),
        ]);

      return {
        requestStatusCounts,
        pendingRequests,
        activeBorrowRequests,
        assetSummary,
        userSummary,
      };
    }),
  ["dashboard-staff-admin-snapshot-v1"],
  {
    revalidate: DASHBOARD_SUMMARY_REVALIDATE_SECONDS,
    tags: [DASHBOARD_BORROW_TAG, DASHBOARD_ASSET_TAG, DASHBOARD_USER_TAG],
  },
);

export function getCachedBorrowerDashboardData(externalUserId: string) {
  return getCachedBorrowerDashboardDataInternal(externalUserId);
}

export function getCachedStaffOrAdminDashboardData(role: Exclude<Role, "borrower">) {
  return getCachedStaffOrAdminDashboardDataInternal(role);
}

export function revalidateBorrowDashboardCache() {
  revalidateTag(DASHBOARD_BORROW_TAG, "max");
}

export function revalidateAssetDashboardCache() {
  revalidateTag(DASHBOARD_ASSET_TAG, "max");
}

export function revalidateUserDashboardCache() {
  revalidateTag(DASHBOARD_USER_TAG, "max");
}

export type BorrowerDashboardData = Awaited<
  ReturnType<typeof getCachedBorrowerDashboardData>
>;
export type StaffOrAdminDashboardData = Awaited<
  ReturnType<typeof getCachedStaffOrAdminDashboardData>
>;
