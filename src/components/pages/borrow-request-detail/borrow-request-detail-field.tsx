type BorrowRequestDetailFieldProps = {
  label: string;
  value: string;
};

export function BorrowRequestDetailField({
  label,
  value,
}: BorrowRequestDetailFieldProps) {
  return (
    <div className="rounded-sm border border-border/80 bg-muted/55 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
