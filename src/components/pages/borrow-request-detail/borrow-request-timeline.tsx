import { formatBorrowRequestDateTime } from "@/components/pages/borrow-request-detail/borrow-request-detail-helpers";
import type { HistoryEvent } from "@/types/history";

type BorrowRequestTimelineProps = {
  loading: boolean;
  timeline: HistoryEvent[];
};

export function BorrowRequestTimeline({
  loading,
  timeline,
}: BorrowRequestTimelineProps) {
  return (
    <section className="surface-panel surface-section">
      <h2 className="text-lg font-semibold">Timeline</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Events recorded against this borrow request in chronological order.
      </p>
      <div className="mt-5 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-sm bg-muted" />
          ))
        ) : timeline.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No timeline entries found for this request.
          </div>
        ) : (
          timeline.map((event) => (
            <div key={event.id} className="rounded-sm border border-border bg-muted/40 px-4 py-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-medium">{event.summary}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {event.actorName ?? event.actorExternalUserId ?? "System"} / {event.reference}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatBorrowRequestDateTime(event.occurredAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
