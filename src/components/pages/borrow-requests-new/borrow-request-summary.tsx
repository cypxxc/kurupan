type BorrowRequestSummaryProps = {
  itemCount: number;
  totalRequestedQty: number;
};

export function BorrowRequestSummary({
  itemCount,
  totalRequestedQty,
}: BorrowRequestSummaryProps) {
  return (
    <div className="surface-panel surface-section">
      <p className="text-sm font-medium text-muted-foreground">Request summary</p>
      <div className="mt-4 grid gap-3">
        <div className="rounded-sm border border-border/80 bg-muted/55 px-4 py-3">
          <p className="text-xs text-muted-foreground">Selected assets</p>
          <p className="mt-1 text-2xl font-semibold">{itemCount}</p>
        </div>
        <div className="rounded-sm border border-border/80 bg-muted/55 px-4 py-3">
          <p className="text-xs text-muted-foreground">Total quantity requested</p>
          <p className="mt-1 text-2xl font-semibold">{totalRequestedQty}</p>
        </div>
      </div>
    </div>
  );
}
