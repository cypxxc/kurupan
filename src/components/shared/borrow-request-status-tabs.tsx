"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BorrowRequestStatus } from "@/types/borrow-requests";

export const BORROW_REQUEST_STATUS_TABS: Array<{
  value: "all" | BorrowRequestStatus;
  label: string;
}> = [
  { value: "all", label: "ทั้งหมด" },
  { value: "pending", label: "รออนุมัติ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "rejected", label: "ปฏิเสธ" },
  { value: "cancelled", label: "ยกเลิก" },
  { value: "partially_returned", label: "คืนบางส่วนแล้ว" },
  { value: "returned", label: "คืนครบแล้ว" },
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
                ? "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                : "bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-transparent dark:text-zinc-100 dark:hover:bg-zinc-800",
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
