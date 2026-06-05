const DAY_MS = 24 * 60 * 60 * 1000;

// The site serves an Israeli audience, so "today" and the daily trend buckets
// follow Israel local time — not the server's UTC clock. Import this anywhere a
// date/time is shown to the admin so everything reads on the same wall clock.
export const TIME_ZONE = "Asia/Jerusalem";

// yyyy-mm-dd for a Date in a given timezone (en-CA gives ISO-style ordering).
const ymd = (timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });

// One point in a daily time series. `iso` is the calendar day key (yyyy-mm-dd)
// used as a stable React key; `label` is the short localized axis label.
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

// Build a full Trend (series + summary stats) from raw timestamps, bucketed by
// Israel local calendar day. Day keys are treated as pure calendar dates and
// stepped via UTC midnight, so the math is DST-safe (no wall-clock offset
// arithmetic that breaks across Israel's spring/autumn clock changes).
export function buildTrend(
  dates: Date[],
  days: number,
  now: number,
  locale: string,
): Trend {
  const israelYmd = ymd(TIME_ZONE);
  const utcYmd = ymd("UTC");

  // The calendar date of "today" in Israel, as a UTC-midnight anchor to step from.
  const [ty, tm, td] = israelYmd.format(new Date(now)).split("-").map(Number);
  const endUTC = Date.UTC(ty, tm - 1, td);

  const labelFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", timeZone: "UTC" });

  const index = new Map<string, number>();
  const points: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(endUTC - i * DAY_MS);
    const iso = utcYmd.format(dt);
    index.set(iso, points.length);
    points.push({ iso, label: labelFmt.format(dt), value: 0 });
  }

  for (const d of dates) {
    const pos = index.get(israelYmd.format(d));
    if (pos !== undefined) points[pos].value++;
  }

  const buckets = points.map((p) => p.value);
  const total = buckets.reduce((s, v) => s + v, 0);
  const average = total / days;

  let peakIdx = 0;
  for (let i = 1; i < buckets.length; i++) if (buckets[i] > buckets[peakIdx]) peakIdx = i;

  const half = Math.floor(days / 2);
  const priorTotal = buckets.slice(0, days - half).reduce((s, v) => s + v, 0);
  const recentTotal = buckets.slice(days - half).reduce((s, v) => s + v, 0);
  // Normalize both halves to a per-day rate before comparing, so an odd window
  // (e.g. 30 → 15/15) doesn't bias the delta.
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
