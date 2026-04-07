export type HistoryEntityType =
  | "asset"
  | "borrow_request"
  | "return_transaction"
  | "user";

export type HistoryEvent = {
  id: number;
  occurredAt: string;
  entityType: HistoryEntityType;
  action: string;
  actorExternalUserId: string | null;
  actorName: string | null;
  entityId: string;
  reference: string;
  summary: string;
};

export type AuditLogEntry = {
  id: number;
  createdAt: string;
  actorExternalUserId: string | null;
  actorName: string | null;
  action: string;
  entityType: HistoryEntityType;
  entityId: string;
  hasBeforeData: boolean;
  hasAfterData: boolean;
};
