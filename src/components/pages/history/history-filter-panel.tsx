"use client";

import { History } from "lucide-react";

import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import type { HistoryEntityType } from "@/types/history";

type HistoryFilterPanelProps = {
  entityType: "all" | HistoryEntityType;
  action: string;
  dateFrom: string;
  dateTo: string;
  entityOptions: Array<{ value: "all" | HistoryEntityType; label: string }>;
  actionOptions: Array<{ value: string; label: string }>;
  onEntityTypeChange: (value: "all" | HistoryEntityType) => void;
  onActionChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
};

export function HistoryFilterPanel({
  entityType,
  action,
  dateFrom,
  dateTo,
  entityOptions,
  actionOptions,
  onEntityTypeChange,
  onActionChange,
  onDateFromChange,
  onDateToChange,
}: HistoryFilterPanelProps) {
  return (
    <section className="filter-shell">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <History className="size-4" />
        Filters
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Combobox
          value={entityType}
          onChange={(value) => onEntityTypeChange((value || "all") as typeof entityType)}
          options={entityOptions.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          placeholder="All entities"
        />

        <Combobox
          value={action}
          onChange={(value) => onActionChange(value || "all")}
          options={actionOptions.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          placeholder="All actions"
        />

        <Input type="date" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} />
        <Input type="date" value={dateTo} onChange={(event) => onDateToChange(event.target.value)} />
      </div>
    </section>
  );
}
