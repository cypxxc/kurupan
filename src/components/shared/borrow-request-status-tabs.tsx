"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BorrowRequestStatus } from "@/types/borrow-requests";

export const BORROW_REQUEST_STATUS_TABS: Array<{
  value: "all" | BorrowRequestStatus;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "partially_returned", label: "Partially returned" },
  { value: "returned", label: "Returned" },
];

export function BorrowRequestStatusTabs({
  value,
  onValueChange,
}: {
  value: "all" | BorrowRequestStatus;
  onValueChange: (value: "all" | BorrowRequestStatus) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {BORROW_REQUEST_STATUS_TABS.map((tab) => {
        const active = value === tab.value;

        return (
          <Button
            key={tab.value}
            type="button"
            variant={active ? "default" : "outline"}
            size="sm"
            className={cn(
              active
                ? "shadow-[0_12px_24px_-14px_rgba(176,104,27,0.55)]"
                : "border-border/80 bg-background/75 text-foreground/75 hover:bg-accent/65 hover:text-foreground dark:bg-transparent dark:text-zinc-100 dark:hover:bg-zinc-800",
            )}
            onClick={() => onValueChange(tab.value)}
          >
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}
