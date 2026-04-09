import type { HistoryEntityType } from "@/types/history";

export type ViewMode = "history" | "audit";

export const ENTITY_OPTIONS: Array<{ value: "all" | HistoryEntityType; label: string }> = [
  { value: "all", label: "All entities" },
  { value: "borrow_request", label: "Borrow request" },
  { value: "return_transaction", label: "Return" },
  { value: "asset", label: "Asset" },
  { value: "user", label: "User" },
];

export const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All actions" },
  { value: "borrow_request.create", label: "Create borrow request" },
  { value: "borrow_request.approve", label: "Approve borrow request" },
  { value: "borrow_request.reject", label: "Reject borrow request" },
  { value: "borrow_request.cancel", label: "Cancel borrow request" },
  { value: "return.create", label: "Create return" },
  { value: "return.update", label: "Update return" },
  { value: "asset.create", label: "Create asset" },
  { value: "asset.update", label: "Update asset" },
  { value: "asset.delete", label: "Delete asset" },
  { value: "user.create", label: "Create user" },
  { value: "user.update", label: "Update user" },
];
