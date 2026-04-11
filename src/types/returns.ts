import type { BorrowRequestDetail, BorrowRequestStatus } from "@/types/borrow-requests";

export type ReturnCondition = "good" | "damaged" | "lost";

export type ReturnTransactionItem = {
  id: number;
  borrowRequestItemId: number;
  assetId: number;
  assetCode: string;
  assetName: string;
  returnQty: number;
  condition: ReturnCondition;
  note: string | null;
};

export type ReturnTransaction = {
  id: number;
  borrowRequestId: number;
  receivedByExternalUserId: string;
  borrowerExternalUserId: string;
  borrowerName: string;
  note: string | null;
  returnedAt: string;
  createdAt: string;
  borrowRequestNo: string;
  items: ReturnTransactionItem[];
};

export type ReturnFormItem = {
  borrowRequestItemId: number;
  assetId: number;
  assetCode: string;
  assetName: string;
  approvedQty: number;
  returnedQty: number;
  remainingQty: number;
  selected: boolean;
  returnQty: number;
  condition: ReturnCondition;
  note: string;
};

export type ReturnEligibleRequestOption = {
  id: number;
  requestNo: string;
  borrowerName: string;
  dueDate: string;
  status: BorrowRequestStatus;
};

export type ReturnPreparationData = {
  eligibleRequests: ReturnEligibleRequestOption[];
  selectedRequest: BorrowRequestDetail | null;
  returnItems: ReturnFormItem[];
};

export function toDateTimeLocalValue(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function fromDateTimeLocalValue(value: string) {
  return new Date(value).toISOString();
}
