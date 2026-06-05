"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Trend } from "@/lib/analytics";

// A readable daily time-series chart: gradient area + line, light gridlines with
// value labels, a dashed 7-day moving-average line, and an interactive crosshair
// that reveals the exact value for any day. Dependency-free (hand-rolled SVG) and
// responsive via a ResizeObserver. Pure presentation — all numbers/labels come in
// pre-localized from the server so this stays i18n-free.
export default function TrendChart({
  trend,
  color,
  locale,
  stats,
}: {
  trend: Trend;
  color: string;
  locale: string;
  stats: { avg: string; peak: string; deltaTitle: string };
}) {
  const points = trend.points;
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  const [hover, setHover] = useState<number | null>(null);
  const gradId = useId();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 168;
  const pad = { top: 12, right: 10, bottom: 22, left: 30 };
  const innerW = Math.max(1, width - pad.left - pad.right);
  const innerH = H - pad.top - pad.bottom;
  const n = points.length;

  const rawMax = Math.max(1, ...points.map((p) => p.value));
  const niceMax = niceCeil(rawMax);

  const xFor = (i: number) => pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yFor = (v: number) => pad.top + innerH - (v / niceMax) * innerH;
  const baseline = pad.top + innerH;

  // 7-day trailing moving average — smooths the daily spikes so the real trend reads.
  const ma = points.map((_, i) => {
    const from = Math.max(0, i - 6);
    const slice = points.slice(from, i + 1);
    return slice.reduce((s, p) => s + p.value, 0) / slice.length;
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(p.value)}`).join(" ");
  const areaPath = `${linePath} L${xFor(n - 1)},${baseline} L${xFor(0)},${baseline} Z`;
  const maPath = ma.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(v)}`).join(" ");

  const gridVals = [0, niceMax / 2, niceMax];
  const nfmt = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  const nfull = new Intl.NumberFormat(locale);

  // x-axis ticks: first / middle / last day labels.
  const tickIdxs = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : points.map((_, i) => i);

  const delta = trend.deltaPct;
  const deltaUp = delta !== null && delta > 0;
  const deltaFlat = delta === null || Math.abs(delta) < 0.5;

  function pointerToIndex(clientX: number) {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left - pad.left;
    const idx = Math.round((x / innerW) * (n - 1));
    return Math.min(n - 1, Math.max(0, idx));
  }

  const active = hover != null ? points[hover] : null;

  return (
    <div>
      {/* Summary header: headline total + period delta, then secondary stats. */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
            {nfull.format(trend.total)}
          </span>
          {!deltaFlat && (
            <span
              title={stats.deltaTitle}
              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                deltaUp
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
              }`}
            >
              <span aria-hidden>{deltaUp ? "▲" : "▼"}</span>
              {Math.abs(delta as number).toFixed(0)}%
            </span>
          )}
        </div>
        <div className="text-end text-xs leading-tight text-slate-500 dark:text-slate-400">
          <div>{stats.avg}</div>
          <div>{stats.peak}</div>
        </div>
      </div>

      <div ref={containerRef} className="relative" dir="ltr">
        <svg
          width={width}
          height={H}
          viewBox={`0 0 ${width} ${H}`}
          className="touch-none select-none"
          role="img"
          aria-label={`${nfull.format(trend.total)} total over ${trend.days} days`}
          onMouseMove={(e) => setHover(pointerToIndex(e.clientX))}
          onMouseLeave={() => setHover(null)}
          onTouchStart={(e) => setHover(pointerToIndex(e.touches[0].clientX))}
          onTouchMove={(e) => setHover(pointerToIndex(e.touches[0].clientX))}
          onTouchEnd={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* horizontal gridlines + y labels */}
          {gridVals.map((v, i) => (
            <g key={i}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={yFor(v)}
                y2={yFor(v)}
                className="stroke-slate-200 dark:stroke-slate-700/60"
                strokeWidth={1}
              />
              <text
                x={pad.left - 6}
                y={yFor(v) + 3}
                textAnchor="end"
                className="fill-slate-400 text-[9px] tabular-nums dark:fill-slate-500"
              >
                {nfmt.format(v)}
              </text>
            </g>
          ))}

          <path d={areaPath} fill={`url(#${gradId})`} />
          <path d={maPath} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="4 3" />
          <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* x-axis day labels */}
          {tickIdxs.map((i) => (
            <text
              key={i}
              x={xFor(i)}
              y={H - 6}
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
              className="fill-slate-400 text-[9px] tabular-nums dark:fill-slate-500"
            >
              {points[i].label}
            </text>
          ))}

          {/* hover crosshair + marker */}
          {active && (
            <g>
              <line
                x1={xFor(hover as number)}
                x2={xFor(hover as number)}
                y1={pad.top}
                y2={baseline}
                stroke={color}
                strokeOpacity={0.4}
                strokeWidth={1}
              />
              <circle cx={xFor(hover as number)} cy={yFor(active.value)} r={4} fill={color} stroke="white" strokeWidth={1.5} />
            </g>
          )}
        </svg>

        {/* hover tooltip */}
        {active && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 px-2 py-1 text-center text-xs text-white shadow-lg dark:bg-slate-700"
            style={{
              left: Math.min(width - 40, Math.max(40, xFor(hover as number))),
              top: yFor(active.value) - 8,
            }}
          >
            <div className="font-semibold tabular-nums">{nfull.format(active.value)}</div>
            <div className="text-[10px] text-slate-300">{active.label}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Round a max value up to a "nice" round number so gridline labels read cleanly
// (e.g. 37 → 40, 230 → 500... actually 230 → 250). Keeps the axis from ugly maxima.
function niceCeil(v: number): number {
  if (v <= 5) return Math.max(1, Math.ceil(v));
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const frac = v / pow; // 1 <= frac < 10
  const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
  return niceFrac * pow;
}
