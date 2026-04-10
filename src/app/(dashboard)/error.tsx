"use client";

import { useEffect } from "react";

import { DashboardErrorState } from "@/components/layouts/dashboard-error-state";

export default function DashboardRouteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <DashboardErrorState onRetry={unstable_retry} digest={error.digest} />;
}
