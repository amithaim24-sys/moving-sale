// Dependency-free horizontal bar chart for category breakdowns (e.g. items by
// status). Bars scale to the largest category. Server-rendered, RTL-safe.
export default function CategoryBars({
  data,
}: {
  data: { label: string; value: number; colorClass?: string }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <div className="w-20 shrink-0 truncate text-slate-500 dark:text-slate-400">{d.label}</div>
          <div className="relative h-5 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded ${d.colorClass ?? "bg-brand"}`}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <div className="w-10 shrink-0 text-end font-medium tabular-nums">{d.value}</div>
        </div>
      ))}
    </div>
  );
}
