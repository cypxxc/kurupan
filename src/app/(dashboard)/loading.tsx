function MetricCardSkeleton() {
  return (
    <div className="metric-tile space-y-3">
      <div className="h-4 w-24 animate-pulse rounded bg-muted/70" />
      <div className="h-9 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
}

export default function DashboardGroupLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-muted/70" />
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-muted/70" />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </section>

      <div className="surface-panel space-y-4 p-5">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted/70" />
        <div className="h-64 w-full animate-pulse rounded bg-muted/60" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="surface-panel space-y-4 p-5">
            <div className="h-6 w-44 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted/70" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((__, rowIndex) => (
                <div
                  key={rowIndex}
                  className="h-12 w-full animate-pulse rounded bg-muted/60"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
