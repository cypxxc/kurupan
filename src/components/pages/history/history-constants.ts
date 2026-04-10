import type { HistoryEntityType } from "@/types/history";

export type ViewMode = "history" | "audit";

export const ENTITY_OPTION_VALUES: Array<"all" | HistoryEntityType> = [
  "all",
  "borrow_request",
  "return_transaction",
  "asset",
  "user",
];

export const ACTION_OPTION_VALUES = [
  "all",
  "borrow_request.create",
  "borrow_request.approve",
  "borrow_request.reject",
  "borrow_request.cancel",
  "return.create",
  "return.update",
  "asset.create",
  "asset.update",
  "asset.delete",
  "user.create",
  "user.update",
] as const;

export function getHistoryEntityLabelKey(entityType: "all" | HistoryEntityType) {
  return `history.entities.${entityType}` as const;
}

export function getHistoryActionLabelKey(action: string) {
  return `history.actions.${action}` as const;
}
