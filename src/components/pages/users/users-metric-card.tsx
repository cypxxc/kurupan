type UsersMetricCardProps = {
  label: string;
  value: number;
};

export function UsersMetricCard({ label, value }: UsersMetricCardProps) {
  return (
    <div className="metric-tile">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="metric-value">{value}</p>
    </div>
  );
}
