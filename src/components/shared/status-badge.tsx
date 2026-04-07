"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock3,
  RefreshCcw,
  ShieldAlert,
  Wrench,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusConfig = {
  label: string;
  icon: LucideIcon;
  className: string;
};

const ASSET_STATUS: Record<string, StatusConfig> = {
  available: {
    label: "พร้อมใช้งาน",
    icon: CheckCircle2,
    className:
      "border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  maintenance: {
    label: "ซ่อมบำรุง",
    icon: Wrench,
    className:
      "border-amber-500/20 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  },
  retired: {
    label: "ปลดระวาง",
    icon: Archive,
    className:
      "border-rose-500/20 bg-rose-500/12 text-rose-700 dark:text-rose-300",
  },
};

const BORROW_STATUS: Record<string, StatusConfig> = {
  pending: {
    label: "รออนุมัติ",
    icon: Clock3,
    className:
      "border-slate-500/20 bg-slate-500/12 text-slate-700 dark:text-slate-300",
  },
  approved: {
    label: "อนุมัติแล้ว",
    icon: CheckCircle2,
    className:
      "border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  rejected: {
    label: "ปฏิเสธ",
    icon: XCircle,
    className:
      "border-rose-500/20 bg-rose-500/12 text-rose-700 dark:text-rose-300",
  },
  cancelled: {
    label: "ยกเลิก",
    icon: ShieldAlert,
    className:
      "border-zinc-500/20 bg-zinc-500/12 text-zinc-700 dark:text-zinc-300",
  },
  partially_returned: {
    label: "คืนบางส่วน",
    icon: RefreshCcw,
    className:
      "border-amber-500/20 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  },
  returned: {
    label: "คืนครบ",
    icon: CheckCircle2,
    className:
      "border-sky-500/20 bg-sky-500/12 text-sky-700 dark:text-sky-300",
  },
};

const RETURN_CONDITION: Record<string, StatusConfig> = {
  good: {
    label: "สภาพดี",
    icon: CheckCircle2,
    className:
      "border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  damaged: {
    label: "ชำรุด",
    icon: AlertTriangle,
    className:
      "border-amber-500/20 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  },
  lost: {
    label: "สูญหาย",
    icon: XCircle,
    className:
      "border-rose-500/20 bg-rose-500/12 text-rose-700 dark:text-rose-300",
  },
};

const STATUS_MAPS = {
  asset: ASSET_STATUS,
  borrow: BORROW_STATUS,
  condition: RETURN_CONDITION,
} as const;

type StatusType = keyof typeof STATUS_MAPS;

export function StatusBadge({
  type,
  value,
  className,
}: {
  type: StatusType;
  value: string;
  className?: string;
}) {
  const config = STATUS_MAPS[type][value];

  if (!config) {
    return (
      <Badge variant="outline" className={className}>
        {value}
      </Badge>
    );
  }

  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 rounded-full px-2.5 py-1", config.className, className)}
    >
      <Icon className="size-3.5" />
      {config.label}
    </Badge>
  );
}
