export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-9 w-36 animate-pulse rounded bg-muted" />
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="metric-tile">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-9 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </section>

      <div className="surface-panel surface-section">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-4 w-72 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid grid-cols-4 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="surface-panel surface-section space-y-3">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
        <div className="surface-panel surface-section space-y-3">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="metric-tile">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-8 w-12 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
