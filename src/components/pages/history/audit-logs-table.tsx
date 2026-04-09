import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { HistoryEmptyState } from "@/components/pages/history/history-empty-state";
import { formatHistoryDateTime } from "@/components/pages/history/history-helpers";
import { cn } from "@/lib/utils";
import type { AuditLogEntry } from "@/types/history";

type AuditLogsTableProps = {
  items: AuditLogEntry[];
  loading: boolean;
};

export function AuditLogsTable({ items, loading }: AuditLogsTableProps) {
  return (
    <section className="table-shell">
      <div className="border-b px-6 py-5">
        <h2 className="text-lg font-semibold">Audit logs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Technical change records for administrative review and traceability.
        </p>
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
          title="No audit logs found"
          description="There are no audit records matching the current filters."
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Captured data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatHistoryDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell>{log.entityType}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.entityId}</TableCell>
                  <TableCell>{log.actorName ?? log.actorExternalUserId ?? "System"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "pointer-events-none h-7 px-2 text-xs",
                        )}
                      >
                        Before: {log.hasBeforeData ? "Yes" : "No"}
                      </span>
                      <span
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "pointer-events-none h-7 px-2 text-xs",
                        )}
                      >
                        After: {log.hasAfterData ? "Yes" : "No"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
