import { cn } from "@/lib/utils";

type DashboardMetricCardProps = {
  label: string;
  value: string | number;
  tone?: "default" | "sky" | "emerald" | "amber";
};

export function DashboardMetricCard({
  label,
  value,
  tone = "default",
}: DashboardMetricCardProps) {
  const toneClass =
    tone === "sky"
      ? "text-sky-600 dark:text-sky-400"
      : tone === "emerald"
        ? "text-emerald-600 dark:text-emerald-400"
        : tone === "amber"
          ? "text-amber-600 dark:text-amber-400"
          : "";

  return (
    <div className="metric-tile">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("metric-value", toneClass)}>{value}</p>
    </div>
  );
}
