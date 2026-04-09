import { ClipboardList } from "lucide-react";

type HistoryEmptyStateProps = {
  title: string;
  description: string;
};

export function HistoryEmptyState({
  title,
  description,
}: HistoryEmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="mx-auto flex size-14 items-center justify-center rounded-sm border border-border bg-muted/55 text-muted-foreground">
        <ClipboardList className="size-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
