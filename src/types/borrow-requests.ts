export const BORROW_REQUEST_STATUS_VALUES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "partially_returned",
  "returned",
] as const;

export type BorrowRequestStatus = (typeof BORROW_REQUEST_STATUS_VALUES)[number];

export type BorrowRequestItemSummary = {
  id: number;
  assetId: number;
  assetCode: string;
  assetName: string;
  requestedQty: number;
  approvedQty: number | null;
};

export type BorrowRequest = {
  id: number;
  requestNo: string;
  borrowerExternalUserId: string;
  borrowerName: string;
  purpose: string | null;
  startDate: string;
  dueDate: string;
  status: BorrowRequestStatus;
  createdAt: string;
  updatedAt?: string;
  items: BorrowRequestItemSummary[];
};

export const BORROW_REQUEST_STATUS_SORT_ORDER: Record<BorrowRequestStatus, number> = {
  pending: 0,
  approved: 1,
  partially_returned: 2,
  returned: 3,
  rejected: 4,
  cancelled: 5,
};

export type BorrowRequestDetail = BorrowRequest & {
  approvedByExternalUserId?: string | null;
  approvedAt?: string | null;
  rejectedByExternalUserId?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  cancelledByExternalUserId?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
};

export type BorrowableAsset = {
  id: number;
  assetCode: string;
  name: string;
  category: string | null;
  location: string | null;
  availableQty: number;
  status: "available" | "maintenance" | "retired";
};

export type BorrowRequestFormItem = {
  assetId: number;
  assetCode: string;
  assetName: string;
  category: string | null;
  location: string | null;
  availableQty: number;
  requestedQty: number;
};

export function isBorrowRequestOverdue(
  status: BorrowRequestStatus,
  dueDate: string,
  now = new Date(),
) {
  if (status !== "approved" && status !== "partially_returned") {
    return false;
  }

  const due = new Date(`${dueDate}T23:59:59`);
  return due.getTime() < now.getTime();
}

export function compareBorrowRequestsForDisplay(
  a: Pick<BorrowRequest, "id" | "status" | "createdAt">,
  b: Pick<BorrowRequest, "id" | "status" | "createdAt">,
) {
  const statusOrder =
    BORROW_REQUEST_STATUS_SORT_ORDER[a.status] - BORROW_REQUEST_STATUS_SORT_ORDER[b.status];

  if (statusOrder !== 0) {
    return statusOrder;
  }

  const createdAtOrder = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

  if (createdAtOrder !== 0) {
    return createdAtOrder;
  }

  return b.id - a.id;
}
