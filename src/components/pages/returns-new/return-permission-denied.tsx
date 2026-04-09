import { ShieldAlert } from "lucide-react";

export function ReturnPermissionDenied() {
  return (
    <div className="empty-state">
      <div className="mx-auto flex size-14 items-center justify-center rounded-sm border border-border bg-muted/55 text-muted-foreground">
        <ShieldAlert className="size-6" />
      </div>
      <h1 className="mt-4 text-xl font-semibold">Access denied</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Only staff and administrators can record item returns.
      </p>
    </div>
  );
}
