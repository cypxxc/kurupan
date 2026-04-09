import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HistoryEmptyState } from "@/components/pages/history/history-empty-state";
import { formatHistoryDateTime, getActionLabel, getEntityLabel } from "@/components/pages/history/history-helpers";
import type { HistoryEvent } from "@/types/history";

type HistoryEventsTableProps = {
  title: string;
  description: string;
  items: HistoryEvent[];
  loading: boolean;
};

export function HistoryEventsTable({
  title,
  description,
  items,
  loading,
}: HistoryEventsTableProps) {
  return (
    <section className="table-shell">
      <div className="border-b px-6 py-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {loading ? (
        <div className="space-y-3 px-6 py-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-sm border border-border/80 bg-muted/55"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <HistoryEmptyState
          title="No history found"
          description="There are no events matching the current filters."
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatHistoryDateTime(item.occurredAt)}
                  </TableCell>
                  <TableCell>{getEntityLabel(item.entityType)}</TableCell>
                  <TableCell>{getActionLabel(item.action)}</TableCell>
                  <TableCell className="font-medium">{item.reference}</TableCell>
                  <TableCell>{item.actorName ?? item.actorExternalUserId ?? "System"}</TableCell>
                  <TableCell className="min-w-72">{item.summary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
