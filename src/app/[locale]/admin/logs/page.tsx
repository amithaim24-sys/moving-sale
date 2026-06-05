import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { TIME_ZONE } from "@/lib/analytics";
import type { Locale } from "@/i18n/config";
import ClearLogsButton from "./ClearLogsButton";

const LEVELS = ["INFO", "WARN", "ERROR"] as const;

// Human-friendly labels for the WhatsApp contact funnel outcomes.
const WA_OUTCOMES = [
  "redirect_wa",
  "no_phone",
  "not_logged_in",
  "rate_limited",
  "not_visible",
  "banned",
  "error",
] as const;

function levelBadge(level: string): string {
  switch (level) {
    case "ERROR":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
    case "WARN":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300";
  }
}

// Application event log viewer. Built to answer "why did the WhatsApp button do
// nothing for this user?" — the funnel at the top shows the distribution of
// contact outcomes, and the table below is the raw, filterable event stream.
export default async function AdminLogsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ event?: string; level?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  await requireAdmin();

  const levelFilter = LEVELS.includes(sp.level as (typeof LEVELS)[number]) ? sp.level : undefined;
  const eventFilter = sp.event && sp.event !== "all" ? sp.event : undefined;

  const now = Date.now();
  const since7 = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const where = {
    ...(levelFilter ? { level: levelFilter } : {}),
    ...(eventFilter ? { event: eventFilter } : {}),
  };

  const [
    logs,
    total,
    distinctEvents,
    waOutcomeRows,
    waClicks7,
    totalEvents7,
    serverErrors7,
    clientErrors7,
    allErrors7,
  ] = await Promise.all([
    prisma.eventLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.eventLog.count({ where }),
    // The set of event names present, for the filter dropdown.
    prisma.eventLog.groupBy({ by: ["event"], _count: { _all: true }, orderBy: { event: "asc" } }),
    // WhatsApp contact funnel (last 7 days), grouped by outcome.
    prisma.eventLog.groupBy({
      by: ["outcome"],
      where: { event: "whatsapp_contact", createdAt: { gte: since7 } },
      _count: { _all: true },
    }),
    // How many client-side clicks fired in the last 7 days — compared with the
    // server's "redirect_wa" count, a gap means clicks that never reached us.
    prisma.eventLog.count({
      where: { event: "client_whatsapp_click", createdAt: { gte: since7 } },
    }),
    // Site-wide health (last 7 days): total events, plus errors from every source.
    prisma.eventLog.count({ where: { createdAt: { gte: since7 } } }),
    prisma.eventLog.count({ where: { event: "server_error", createdAt: { gte: since7 } } }),
    prisma.eventLog.count({ where: { event: "client_error", createdAt: { gte: since7 } } }),
    prisma.eventLog.count({ where: { level: "ERROR", createdAt: { gte: since7 } } }),
  ]);

  const waCounts: Record<string, number> = {};
  for (const r of waOutcomeRows) if (r.outcome) waCounts[r.outcome] = r._count._all;
  const waSuccess = waCounts["redirect_wa"] ?? 0;
  // Clicks that fired in the browser but produced no successful server hand-off.
  const lostClicks = Math.max(0, waClicks7 - waSuccess);

  const num = (n: number) => n.toLocaleString(locale);
  const dtf = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "medium", timeZone: TIME_ZONE });

  // Preserve the other filter when building a filter link.
  const buildHref = (next: { event?: string; level?: string }) => {
    const p = new URLSearchParams();
    const ev = next.event ?? eventFilter;
    const lv = next.level ?? levelFilter;
    if (ev) p.set("event", ev);
    if (lv) p.set("level", lv);
    const qs = p.toString();
    return `/${locale}/admin/logs${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("logsPage.title")}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("logsPage.subtitle")}</p>
        </div>
        <ClearLogsButton
          label={t("logsPage.clearOld")}
          confirmText={t("logsPage.confirmClear")}
          doneText={t("logsPage.cleared")}
        />
      </div>

      {/* Site-wide health overview (last 7 days). Covers every logged source:
          server errors, client/browser errors, and the full event volume. */}
      <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t("logsPage.overviewTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FunnelStat label={t("logsPage.totalEvents")} value={num(totalEvents7)} />
          <FunnelStat
            label={t("logsPage.allErrors")}
            value={num(allErrors7)}
            tone={allErrors7 > 0 ? "bad" : "good"}
          />
          <Link href={buildHref({ event: "server_error" })} className="block">
            <FunnelStat
              label={t("logsPage.serverErrors")}
              value={num(serverErrors7)}
              tone={serverErrors7 > 0 ? "bad" : undefined}
            />
          </Link>
          <Link href={buildHref({ event: "client_error" })} className="block">
            <FunnelStat
              label={t("logsPage.clientErrors")}
              value={num(clientErrors7)}
              tone={clientErrors7 > 0 ? "bad" : undefined}
            />
          </Link>
        </div>
      </section>

      {/* WhatsApp contact funnel — the headline answer for "is the button working?" */}
      <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t("logsPage.waFunnelTitle")}
        </h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{t("logsPage.waFunnelHint")}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <FunnelStat label={t("logsPage.waClicks")} value={num(waClicks7)} />
          <FunnelStat label={t("logsPage.waSuccess")} value={num(waSuccess)} tone="good" />
          <FunnelStat
            label={t("logsPage.waLostClicks")}
            value={num(lostClicks)}
            tone={lostClicks > 0 ? "bad" : undefined}
          />
          {WA_OUTCOMES.filter((o) => o !== "redirect_wa" && (waCounts[o] ?? 0) > 0).map((o) => (
            <FunnelStat
              key={o}
              label={t(`logsPage.outcome.${o}`)}
              value={num(waCounts[o] ?? 0)}
              tone={o === "error" ? "bad" : "warn"}
            />
          ))}
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-slate-500 dark:text-slate-400">{t("logsPage.filterLevel")}</span>
        <FilterChip href={buildHref({ level: undefined })} active={!levelFilter} label={t("logsPage.all")} />
        {LEVELS.map((lv) => (
          <FilterChip key={lv} href={buildHref({ level: lv })} active={levelFilter === lv} label={lv} />
        ))}
        <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
        <span className="font-medium text-slate-500 dark:text-slate-400">{t("logsPage.filterEvent")}</span>
        <FilterChip href={buildHref({ event: "all" })} active={!eventFilter} label={t("logsPage.all")} />
        {distinctEvents.map((e) => (
          <FilterChip
            key={e.event}
            href={buildHref({ event: e.event })}
            active={eventFilter === e.event}
            label={`${e.event} (${num(e._count._all)})`}
          />
        ))}
      </div>

      {/* Event table */}
      {logs.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
          {t("logsPage.none")}
        </p>
      ) : (
        <>
          <p className="text-xs text-slate-400">
            {t("logsPage.showing", { shown: num(logs.length), total: num(total) })}
          </p>
          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-3 py-2 text-start font-medium text-slate-600 dark:text-slate-300">{t("logsPage.colTime")}</th>
                  <th className="px-3 py-2 text-start font-medium text-slate-600 dark:text-slate-300">{t("logsPage.colLevel")}</th>
                  <th className="px-3 py-2 text-start font-medium text-slate-600 dark:text-slate-300">{t("logsPage.colEvent")}</th>
                  <th className="px-3 py-2 text-start font-medium text-slate-600 dark:text-slate-300">{t("logsPage.colOutcome")}</th>
                  <th className="px-3 py-2 text-start font-medium text-slate-600 dark:text-slate-300">{t("logsPage.colItem")}</th>
                  <th className="px-3 py-2 text-start font-medium text-slate-600 dark:text-slate-300">{t("logsPage.colDetails")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-400">
                      <time dateTime={log.createdAt.toISOString()}>{dtf.format(log.createdAt)}</time>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${levelBadge(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-200">
                      {log.event}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {log.outcome ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {log.itemId ? (
                        <Link
                          href={`/${locale}/items/${log.itemId}`}
                          className="text-brand hover:underline"
                        >
                          {log.itemId.slice(0, 8)}…
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                      <div className="max-w-md space-y-1">
                        {log.message && <div className="text-slate-700 dark:text-slate-200">{log.message}</div>}
                        {log.userId && (
                          <div>
                            <span className="text-slate-400">user:</span> {log.userId.slice(0, 8)}…
                          </div>
                        )}
                        {log.userAgent && (
                          <div className="truncate" title={log.userAgent}>
                            <span className="text-slate-400">ua:</span> {log.userAgent}
                          </div>
                        )}
                        {log.meta != null && (
                          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-slate-50 p-1.5 font-mono text-[11px] text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                            {JSON.stringify(log.meta)}
                          </pre>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function FunnelStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "warn";
}) {
  const valueClass =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "bad"
        ? "text-rose-600 dark:text-rose-400"
        : tone === "warn"
          ? "text-amber-600 dark:text-amber-400"
          : "text-slate-900 dark:text-white";
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
      <div className={`text-xl font-bold tabular-nums ${valueClass}`}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-white"
          : "rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
      }
    >
      {label}
    </Link>
  );
}
