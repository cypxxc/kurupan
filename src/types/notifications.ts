export const NOTIFICATION_TYPE_VALUES = [
  "borrow_request_created",
  "borrow_request_approved",
  "borrow_request_rejected",
  "borrow_request_cancelled",
  "return_recorded",
  "due_date_approaching",
  "overdue",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPE_VALUES)[number];
export type NotificationEntityType = "borrow_request" | "return_transaction";

export type NotificationItem = {
  id: number;
  recipientExternalUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type NotificationSSEPayload =
  | { type: "new_notification"; notification: NotificationItem }
  | { type: "unread_count"; count: number }
  | { type: "ping" };
