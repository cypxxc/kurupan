import Link from "next/link";
import { AlertTriangle, RefreshCcw } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardErrorStateProps = {
  onRetry: () => void;
  digest?: string;
  withPageShell?: boolean;
};

function ErrorContent({ onRetry, digest }: Omit<DashboardErrorStateProps, "withPageShell">) {
  const { t } = useI18n();

  return (
    <div className="rounded-3xl border bg-card px-6 py-14 text-center shadow-sm">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {t("dashboardError.eyebrow")}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("dashboardError.title")}</h1>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t("dashboardError.description")}
      </p>

      {digest ? (
        <p className="mt-4 text-xs text-muted-foreground">
          <span className="font-mono">{t("dashboardError.reference", { digest })}</span>
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={onRetry} className="gap-2">
          <RefreshCcw className="size-4" />
          {t("dashboardError.retry")}
        </Button>
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
          {t("dashboardError.back")}
        </Link>
      </div>
    </div>
  );
}

export function DashboardErrorState({
  onRetry,
  digest,
  withPageShell = false,
}: DashboardErrorStateProps) {
  if (withPageShell) {
    return (
      <div className="app-page">
        <ErrorContent onRetry={onRetry} digest={digest} />
      </div>
    );
  }

  return <ErrorContent onRetry={onRetry} digest={digest} />;
}
