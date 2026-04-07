"use client";

import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function OverdueBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full border-rose-500/20 bg-rose-500/12 px-2.5 py-1 text-rose-700 dark:text-rose-300",
        className,
      )}
    >
      <AlertTriangle className="size-3.5" />
      เกินกำหนด
    </Badge>
  );
}
