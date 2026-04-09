"use client";

import { useEffect, useState, type CSSProperties } from "react";

import type { DashboardRequest } from "@/components/pages/dashboard/dashboard-types";
import { BORROW_REQUEST_STATUS_VALUES, type BorrowRequestStatus } from "@/types/borrow-requests";

type DashboardRequestStatusChartProps = {
  requests: DashboardRequest[];
};

type StatusChartConfig = {
  label: string;
  color: CSSProperties["color"];
};

const STATUS_CHART_CONFIG: Record<BorrowRequestStatus, StatusChartConfig> = {
  pending: {
    label: "Pending",
    color: "var(--color-chart-1)",
  },
  approved: {
    label: "Approved",
    color: "var(--color-chart-3)",
  },
  rejected: {
    label: "Rejected",
    color: "var(--destructive)",
  },
  cancelled: {
    label: "Cancelled",
    color: "var(--muted-foreground)",
  },
  partially_returned: {
    label: "Partially returned",
    color: "var(--color-chart-4)",
  },
  returned: {
    label: "Returned",
    color: "var(--color-chart-2)",
  },
};

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatRatio(value: number, total: number) {
  return `${value}/${total}`;
}

export function DashboardRequestStatusChart({
  requests,
}: DashboardRequestStatusChartProps) {
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    let nextFrame = 0;
    const currentFrame = requestAnimationFrame(() => {
      nextFrame = requestAnimationFrame(() => {
        setIsChartReady(true);
      });
    });

    return () => {
      cancelAnimationFrame(currentFrame);
      cancelAnimationFrame(nextFrame);
    };
  }, []);

  const counts = BORROW_REQUEST_STATUS_VALUES.reduce<Record<BorrowRequestStatus, number>>(
    (accumulator, status) => {
      accumulator[status] = 0;
      return accumulator;
    },
    {} as Record<BorrowRequestStatus, number>,
  );

  for (const request of requests) {
    counts[request.status] += 1;
  }

  const chartItems = BORROW_REQUEST_STATUS_VALUES.map((status) => ({
    status,
    label: STATUS_CHART_CONFIG[status].label,
    color: STATUS_CHART_CONFIG[status].color,
    count: counts[status],
  }));

  const maxValue = Math.max(...chartItems.map((item) => item.count), 1);
  const totalRequests = requests.length;
  const resolvedRequests = counts.returned + counts.rejected + counts.cancelled;
  const inProgressRequests = counts.pending + counts.approved + counts.partially_returned;
  const topStatus =
    chartItems.reduce<(typeof chartItems)[number] | null>((currentTop, item) => {
      if (!currentTop || item.count > currentTop.count) {
        return item;
      }

      return currentTop;
    }, null) ?? chartItems[0];

  return (
    <section className="surface-panel surface-section">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Request status graph</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Distribution of borrow request statuses visible to the current account.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Total requests: <span className="font-medium text-foreground">{totalRequests}</span>
        </p>
      </div>

      {totalRequests === 0 ? (
        <div className="empty-state mt-5 py-10">
          <p className="text-sm text-muted-foreground">No request data available for this graph.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.9fr)]">
          <div className="rounded-sm border border-border/80 bg-muted/30 px-4 py-5 sm:px-5">
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <div
                className="rounded-sm border border-border/70 bg-background/70 px-4 py-3 dashboard-chart-detail"
                data-chart-ready={isChartReady}
              >
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Top status
                </p>
                <p className="mt-2 text-base font-semibold text-foreground">{topStatus.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatRatio(topStatus.count, totalRequests)} requests
                </p>
              </div>
              <div
                className="rounded-sm border border-border/70 bg-background/70 px-4 py-3 dashboard-chart-detail"
                data-chart-ready={isChartReady}
              >
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Resolved
                </p>
                <p className="mt-2 text-base font-semibold text-foreground">
                  {formatPercent((resolvedRequests / totalRequests) * 100)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatRatio(resolvedRequests, totalRequests)} completed outcomes
                </p>
              </div>
              <div
                className="rounded-sm border border-border/70 bg-background/70 px-4 py-3 dashboard-chart-detail"
                data-chart-ready={isChartReady}
              >
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  In progress
                </p>
                <p className="mt-2 text-base font-semibold text-foreground">
                  {formatPercent((inProgressRequests / totalRequests) * 100)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatRatio(inProgressRequests, totalRequests)} active workflow items
                </p>
              </div>
            </div>
            <div className="flex h-72 items-end gap-3 sm:gap-4">
              {chartItems.map((item, index) => {
                const barHeight = `${Math.max((item.count / maxValue) * 100, item.count > 0 ? 12 : 0)}%`;
                const share = totalRequests > 0 ? (item.count / totalRequests) * 100 : 0;

                return (
                  <div
                    key={item.status}
                    className="flex min-w-0 flex-1 flex-col items-center gap-3 dashboard-chart-column"
                    style={{ animationDelay: `${120 + index * 90}ms` }}
                    data-chart-ready={isChartReady}
                  >
                    <div className="text-xs font-medium text-muted-foreground">
                      {item.count}
                    </div>
                    <div className="flex h-56 w-full items-end justify-center rounded-sm bg-background/70 px-2 py-2">
                      <div
                        className="dashboard-chart-bar w-full max-w-12 rounded-t-sm"
                        style={{
                          height: barHeight,
                          backgroundColor: item.color,
                          animationDelay: `${220 + index * 90}ms`,
                        }}
                        data-chart-ready={isChartReady}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="text-center text-xs leading-5 text-muted-foreground">
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p>{formatPercent(share)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {chartItems.map((item, index) => {
              const share = totalRequests > 0 ? (item.count / totalRequests) * 100 : 0;

              return (
                <div
                  key={`${item.status}-summary`}
                  className="dashboard-chart-summary rounded-sm border border-border/80 bg-background/60 px-4 py-3"
                  style={{ animationDelay: `${280 + index * 70}ms` }}
                  data-chart-ready={isChartReady}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      />
                      <p className="truncate text-sm font-medium">{item.label}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.count}</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="dashboard-chart-progress h-full rounded-full"
                      style={{
                        width: `${share}%`,
                        backgroundColor: item.color,
                        animationDelay: `${360 + index * 70}ms`,
                      }}
                      data-chart-ready={isChartReady}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
