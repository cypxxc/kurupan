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

import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusConfig = {
  labelKey: string;
  icon: LucideIcon;
  className: string;
};

const ASSET_STATUS: Record<string, StatusConfig> = {
  available: {
    labelKey: "common.statuses.asset.available",
    icon: CheckCircle2,
    className:
      "border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  maintenance: {
    labelKey: "common.statuses.asset.maintenance",
    icon: Wrench,
    className:
      "border-amber-500/20 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  },
  retired: {
    labelKey: "common.statuses.asset.retired",
    icon: Archive,
    className:
      "border-rose-500/20 bg-rose-500/12 text-rose-700 dark:text-rose-300",
  },
};

const BORROW_STATUS: Record<string, StatusConfig> = {
  pending: {
    labelKey: "common.statuses.borrow.pending",
    icon: Clock3,
    className:
      "border-slate-500/20 bg-slate-500/12 text-slate-700 dark:text-slate-300",
  },
  approved: {
    labelKey: "common.statuses.borrow.approved",
    icon: CheckCircle2,
    className:
      "border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  rejected: {
    labelKey: "common.statuses.borrow.rejected",
    icon: XCircle,
    className:
      "border-rose-500/20 bg-rose-500/12 text-rose-700 dark:text-rose-300",
  },
  cancelled: {
    labelKey: "common.statuses.borrow.cancelled",
    icon: ShieldAlert,
    className:
      "border-zinc-500/20 bg-zinc-500/12 text-zinc-700 dark:text-zinc-300",
  },
  partially_returned: {
    labelKey: "common.statuses.borrow.partiallyReturned",
    icon: RefreshCcw,
    className:
      "border-amber-500/20 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  },
  returned: {
    labelKey: "common.statuses.borrow.returned",
    icon: CheckCircle2,
    className:
      "border-sky-500/20 bg-sky-500/12 text-sky-700 dark:text-sky-300",
  },
};

const RETURN_CONDITION: Record<string, StatusConfig> = {
  good: {
    labelKey: "common.statuses.condition.good",
    icon: CheckCircle2,
    className:
      "border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  damaged: {
    labelKey: "common.statuses.condition.damaged",
    icon: AlertTriangle,
    className:
      "border-amber-500/20 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  },
  lost: {
    labelKey: "common.statuses.condition.lost",
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
  const { t } = useI18n();
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
      {t(config.labelKey)}
    </Badge>
  );
}
