// Conversion funnel: stacked horizontal bars that shrink stage to stage, each
// annotated with its conversion rate from the step before. Lets an admin see at a
// glance where visitors drop off (visits → item views → contact clicks).
// Server-rendered, dependency-free, RTL-safe (logical flow, no left/right).
export default function Funnel({
  rows,
  ofPreviousTitle,
}: {
  rows: { label: string; value: string; rawValue: number; rate: string | null; colorClass: string }[];
  ofPreviousTitle: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.rawValue));

  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="font-medium text-slate-600 dark:text-slate-300">{r.label}</span>
            <span className="flex items-center gap-2">
              {r.rate && (
                <span
                  title={ofPreviousTitle}
                  className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500 tabular-nums dark:bg-slate-800 dark:text-slate-400"
                >
                  {r.rate}
                </span>
              )}
              <span className="font-bold tabular-nums text-slate-900 dark:text-white">{r.value}</span>
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full ${r.colorClass}`}
              style={{ width: `${Math.max((r.rawValue / max) * 100, r.rawValue > 0 ? 3 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
