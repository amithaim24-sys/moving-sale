// Dependency-free daily trend chart: a row of flex bars whose heights scale to the
// busiest day. Server-rendered (pure CSS, no client JS). Each bar carries a native
// title tooltip for the exact value.
export default function TrendBars({
  data,
  accentClass = "bg-brand",
  ariaLabel,
}: {
  data: { label: string; value: number }[];
  accentClass?: string;
  ariaLabel?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div role="img" aria-label={ariaLabel ?? `Trend, ${total} total`}>
      <div className="flex h-32 items-end gap-px border-b border-slate-200 dark:border-slate-800">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1"
            title={`${d.label}: ${d.value}`}
          >
            <div
              className={`w-full rounded-t-sm ${accentClass} ${d.value === 0 ? "opacity-0" : "opacity-90"}`}
              style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
