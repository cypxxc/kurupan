// Mirrors key app types — no cross-package imports allowed

export type Role = "borrower" | "staff" | "admin";
export type AssetStatus = "available" | "maintenance" | "retired";
export type BorrowRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "partially_returned"
  | "returned";
export type ReturnCondition = "good" | "damaged" | "lost";
export type NotificationType =
  | "borrow_request_created"
  | "borrow_request_approved"
  | "borrow_request_rejected"
  | "borrow_request_cancelled"
  | "return_recorded"
  | "due_date_approaching"
  | "overdue";

export interface Asset {
  id: number;
  assetCode: string;
  name: string;
  category: string | null;
  description: string | null;
  location: string | null;
  totalQty: number;
  availableQty: number;
  status: AssetStatus;
  assetCodeSeriesId: number | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  usefulLifeYears: number | null;
  residualValue: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetCodeSeries {
  id: number;
  name: string;
  prefix: string;
  separator: string;
  padLength: number;
  counter: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BorrowRequestItem {
  id: number;
  borrowRequestId: number;
  assetId: number;
  requestedQty: number;
  approvedQty: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BorrowRequest {
  id: number;
  requestNo: string;
  borrowerExternalUserId: string;
  purpose: string;
  startDate: string;
  dueDate: string;
  status: BorrowRequestStatus;
  approvedByExternalUserId: string | null;
  approvedAt: string | null;
  rejectedByExternalUserId: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  cancelledByExternalUserId: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  items?: BorrowRequestItem[];
}

export interface ReturnTransactionItem {
  id: number;
  returnTransactionId: number;
  borrowRequestItemId: number;
  returnQty: number;
  condition: ReturnCondition;
  note: string | null;
}

export interface ReturnTransaction {
  id: number;
  borrowRequestId: number;
  receivedByExternalUserId: string;
  note: string | null;
  returnedAt: string;
  createdAt: string;
  items?: ReturnTransactionItem[];
}

export interface User {
  externalUserId: string;
  username: string;
  fullName: string;
  email: string | null;
  employeeCode: string | null;
  department: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentActor {
  externalUserId: string;
  role: Role;
  fullName?: string;
  email?: string | null;
  employeeCode?: string | null;
  department?: string | null;
}

export interface Notification {
  id: number;
  recipientExternalUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: number;
  actorExternalUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeData: unknown;
  afterData: unknown;
  createdAt: string;
}

export type HistoryEntityType =
  | "asset"
  | "borrow_request"
  | "return_transaction"
  | "user";

export interface HistoryEvent {
  id: number;
  occurredAt: string;
  entityType: HistoryEntityType;
  action: string;
  actorExternalUserId: string | null;
  actorName: string | null;
  entityId: string;
  reference: string;
  summary: string;
}

export interface AuditLogEntry {
  id: number;
  createdAt: string;
  actorExternalUserId: string | null;
  actorName: string | null;
  action: string;
  entityType: HistoryEntityType;
  entityId: string;
  hasBeforeData: boolean;
  hasAfterData: boolean;
}
