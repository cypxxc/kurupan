"use client";

import { useEffect, type ReactNode } from "react";
import { unstable_catchError as catchError, type ErrorInfo } from "next/error";

import { DashboardErrorState } from "@/components/layouts/dashboard-error-state";

function DashboardRuntimeErrorFallback(
  props: { children: ReactNode },
  { error, unstable_retry }: ErrorInfo,
) {
  void props;

  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    "digest" in error && typeof error.digest === "string" ? error.digest : undefined;

  return <DashboardErrorState onRetry={unstable_retry} digest={digest} withPageShell />;
}

export default catchError(DashboardRuntimeErrorFallback);
