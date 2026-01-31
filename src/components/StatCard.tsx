type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
  trend?: "up" | "down" | "neutral";
};

export default function StatCard({ label, value, helper, trend }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 xs:p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">
            {label}
          </p>
          {trend && (
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
              trend === "up" ? "bg-emerald-100 text-emerald-600" :
              trend === "down" ? "bg-red-100 text-red-600" :
              "bg-slate-100 text-slate-600"
            }`}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
            </span>
          )}
        </div>
        <p className="mt-2 xs:mt-3 text-2xl xs:text-3xl font-bold tracking-tight text-[var(--foreground)]">
          {value}
        </p>
        {helper ? (
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            {helper}
          </p>
        ) : null}
      </div>
    </div>
  );
}
