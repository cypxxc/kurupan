"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  previousLabel?: string;
  nextLabel?: string;
};

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  previousLabel = "Previous",
  nextLabel = "Next",
}: PaginationControlsProps) {
  return (
    <div className="flex items-center gap-2 self-end">
      <button
        type="button"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        <ChevronLeft className="size-3.5" />
        {previousLabel}
      </button>
      <span className="min-w-16 text-center text-muted-foreground">
        {page} / {Math.max(1, totalPages)}
      </span>
      <button
        type="button"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
      >
        {nextLabel}
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  );
}
