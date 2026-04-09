import type { Asset } from "@/types/assets";
import type { BorrowRequest } from "@/types/borrow-requests";

export type DashboardRequest = {
  id: number;
  requestNo: string;
  borrowerName: string;
  dueDate: string | Date;
  status: BorrowRequest["status"];
};

export type DashboardAsset = Pick<Asset, "status" | "availableQty">;
