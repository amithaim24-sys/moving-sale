const DAY_MS = 24 * 60 * 60 * 1000;

// Group a set of timestamps into one bucket per UTC day for the last `days` days,
// ending today. Returns chronological { label, value } pairs ready for a bar chart.
// UTC day boundaries keep results deterministic regardless of server timezone.
export function bucketByDay(
  dates: Date[],
  days: number,
  now: number,
  locale: string,
): { label: string; value: number }[] {
  const endIdx = Math.floor(now / DAY_MS);
  const startIdx = endIdx - (days - 1);
  const buckets = new Array<number>(days).fill(0);

  for (const d of dates) {
    const pos = Math.floor(d.getTime() / DAY_MS) - startIdx;
    if (pos >= 0 && pos < days) buckets[pos]++;
  }

  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", timeZone: "UTC" });
  return buckets.map((value, i) => ({
    label: fmt.format(new Date((startIdx + i) * DAY_MS)),
    value,
  }));
}
