// Dependency-free horizontal bar chart for category breakdowns (e.g. items by
// status). Bars scale to the largest category; each row also shows its share of
// the total so the mix is readable at a glance. Server-rendered, RTL-safe.
export default function CategoryBars({
  data,
  locale = "en",
}: {
  data: { label: string; value: number; colorClass?: string }[];
  locale?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const pct = (v: number) => (total > 0 ? `${Math.round((v / total) * 100)}%` : "0%");
  const num = (v: number) => v.toLocaleString(locale);

  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <div className="w-20 shrink-0 truncate text-slate-500 dark:text-slate-400">{d.label}</div>
          <div className="relative h-5 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded ${d.colorClass ?? "bg-brand"}`}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <div className="w-9 shrink-0 text-end text-xs tabular-nums text-slate-400 dark:text-slate-500">
            {pct(d.value)}
          </div>
          <div className="w-10 shrink-0 text-end font-semibold tabular-nums">{num(d.value)}</div>
        </div>
      ))}
    </div>
  );
}
