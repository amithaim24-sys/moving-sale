const DAY_MS = 24 * 60 * 60 * 1000;

// One point in a daily time series. `iso` is the UTC day key (yyyy-mm-dd) used as a
// stable React key and tooltip date; `label` is the short localized axis label.
export type TrendPoint = { iso: string; label: string; value: number };

// A full trend ready for the chart: the daily series plus the summary numbers an
// admin actually wants at a glance (total, daily average, busiest day, and how the
// most recent half of the window compares to the half before it).
export type Trend = {
  points: TrendPoint[];
  total: number;
  average: number;
  peak: { value: number; iso: string; label: string };
  /** % change of the recent half vs the previous half. null when the prior half is empty. */
  deltaPct: number | null;
  /** Sum over the most recent half of the window (e.g. last 15 of 30 days). */
  recentTotal: number;
  /** Sum over the older half of the window. */
  priorTotal: number;
  days: number;
};

// Group a set of timestamps into one bucket per UTC day for the last `days` days,
// ending today. Returns chronological { label, value } pairs ready for a bar chart.
// UTC day boundaries keep results deterministic regardless of server timezone.
export function bucketByDay(
  dates: Date[],
  days: number,
  now: number,
  locale: string,
): { label: string; value: number }[] {
  return buildTrend(dates, days, now, locale).points.map((p) => ({ label: p.label, value: p.value }));
}

// Build a full Trend (series + summary stats) from raw timestamps.
export function buildTrend(
  dates: Date[],
  days: number,
  now: number,
  locale: string,
): Trend {
  const endIdx = Math.floor(now / DAY_MS);
  const startIdx = endIdx - (days - 1);
  const buckets = new Array<number>(days).fill(0);

  for (const d of dates) {
    const pos = Math.floor(d.getTime() / DAY_MS) - startIdx;
    if (pos >= 0 && pos < days) buckets[pos]++;
  }

  const labelFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", timeZone: "UTC" });
  const isoFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }); // yyyy-mm-dd

  const points: TrendPoint[] = buckets.map((value, i) => {
    const date = new Date((startIdx + i) * DAY_MS);
    return { iso: isoFmt.format(date), label: labelFmt.format(date), value };
  });

  const total = buckets.reduce((s, v) => s + v, 0);
  const average = total / days;

  let peakIdx = 0;
  for (let i = 1; i < buckets.length; i++) if (buckets[i] > buckets[peakIdx]) peakIdx = i;

  const half = Math.floor(days / 2);
  const priorTotal = buckets.slice(0, days - half).reduce((s, v) => s + v, 0);
  const recentTotal = buckets.slice(days - half).reduce((s, v) => s + v, 0);
  // Normalize both halves to the same number of days before comparing, so an
  // odd window (e.g. 30 → 15/15) doesn't bias the delta.
  const priorDays = days - half;
  const recentDays = half;
  const priorRate = priorDays > 0 ? priorTotal / priorDays : 0;
  const recentRate = recentDays > 0 ? recentTotal / recentDays : 0;
  const deltaPct = priorRate > 0 ? ((recentRate - priorRate) / priorRate) * 100 : null;

  return {
    points,
    total,
    average,
    peak: { value: buckets[peakIdx], iso: points[peakIdx].iso, label: points[peakIdx].label },
    deltaPct,
    recentTotal,
    priorTotal,
    days,
  };
}
