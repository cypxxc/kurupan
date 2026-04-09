import { ACTION_OPTIONS, ENTITY_OPTIONS } from "@/components/pages/history/history-constants";
import type { HistoryEntityType } from "@/types/history";

export function formatHistoryDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getEntityLabel(entityType: HistoryEntityType) {
  return ENTITY_OPTIONS.find((option) => option.value === entityType)?.label ?? entityType;
}

export function getActionLabel(action: string) {
  return ACTION_OPTIONS.find((option) => option.value === action)?.label ?? action;
}
