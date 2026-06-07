import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getStoreBySlug } from "@/lib/stores";
import { requireStoreAdmin } from "@/lib/guards";
import { absoluteUrl } from "@/lib/url";
import { TIME_ZONE } from "@/lib/analytics";
import StoreShareBar from "@/components/StoreShareBar";
import PriceOrFreeBadge from "@/components/PriceOrFreeBadge";
import type { Locale } from "@/i18n/config";

// Per-store admin dashboard — the store's own "separate admin". Owner-only; every
// number is scoped to this store. The platform super-admin keeps the global /admin.
export default async function StoreAdminPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const store = await getStoreBySlug(slug);
  if (!store) notFound();
  await requireStoreAdmin(store.id, slug);

  const base = `/${locale}/s/${store.slug}`;
  const [items, members, visits, contactClicks, storeUrl] = await Promise.all([
    prisma.item.findMany({
      where: { storeId: store.id },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        priceIls: true,
        previousPriceIls: true,
        viewCount: true,
        clickCount: true,
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.storeMembership.findMany({
      where: { storeId: store.id },
      select: {
        id: true,
        role: true,
        banned: true,
        displayName: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.visit.count({ where: { storeId: store.id } }),
    prisma.itemClick.count({ where: { item: { storeId: store.id } } }),
    absoluteUrl(base),
  ]);

  const num = (n: number) => n.toLocaleString(locale);
  const ils = (n: number) => `₪${n.toLocaleString(locale)}`;
  const dtf = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: TIME_ZONE });

  const available = items.filter((i) => i.status === "AVAILABLE").length;
  const sold = items.filter((i) => i.status === "SOLD").length;
  const totalViews = items.reduce((s, i) => s + i.viewCount, 0);
  const sellItems = items.filter((i) => i.type === "SELL" && i.priceIls != null);
  const potential = sellItems.filter((i) => i.status !== "SOLD").reduce((s, i) => s + (i.priceIls ?? 0), 0);
  const realized = sellItems.filter((i) => i.status === "SOLD").reduce((s, i) => s + (i.priceIls ?? 0), 0);

  const kpis = [
    { label: t("admin.metrics.items"), value: num(items.length) },
    { label: t("admin.metrics.available"), value: num(available) },
    { label: t("admin.metrics.sold"), value: num(sold) },
    { label: t("admin.metrics.totalViews"), value: num(totalViews) },
    { label: t("admin.metrics.totalVisits"), value: num(visits) },
    { label: t("admin.metrics.contactClicks"), value: num(contactClicks) },
    { label: t("storeAdmin.members"), value: num(members.length) },
    { label: t("admin.metrics.potentialRevenue"), value: ils(potential) },
    { label: t("admin.metrics.realizedRevenue"), value: ils(realized) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t("storeAdmin.title", { name: store.name })}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t("storeAdmin.intro")}</p>
        </div>
        <Link href={`/${locale}/my/items/new`} className="btn-primary text-sm">
          + {t("nav.newItem")}
        </Link>
      </div>

      <StoreShareBar url={storeUrl} />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{k.value}</div>
            <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Items */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("storeAdmin.itemsTitle")}</h2>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("item.noItems")}</p>
        ) : (
          <ul className="divide-y rounded-2xl bg-white ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 p-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {item.images[0] && (
                    <Image src={item.images[0].url} alt="" fill className="object-cover" sizes="56px" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`${base}/items/${item.id}`} className="truncate font-medium hover:underline">
                    {item.title}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {t(`item.status.${item.status as "AVAILABLE"}`)} · 👁 {num(item.viewCount)} · 🖱 {num(item.clickCount)}
                  </div>
                </div>
                <PriceOrFreeBadge
                  type={item.type as "SELL" | "GIVE"}
                  priceIls={item.priceIls}
                  previousPriceIls={item.previousPriceIls}
                />
                <Link href={`/${locale}/my/items/${item.id}/edit`} className="btn-secondary shrink-0 text-xs">
                  {t("form.edit")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Members (this store's user list) */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("storeAdmin.membersTitle")}</h2>
        {members.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("storeAdmin.noMembers")}</p>
        ) : (
          <ul className="divide-y rounded-2xl bg-white ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {m.displayName || m.user.name || m.user.email}
                  </span>
                  {m.banned && <span className="ms-2 text-xs text-rose-600">{t("storeAdmin.bannedTag")}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {m.role === "ADMIN" && (
                    <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand">
                      {t("storeAdmin.roleAdmin")}
                    </span>
                  )}
                  <time className="text-xs text-slate-400" dateTime={m.createdAt.toISOString()}>
                    {dtf.format(m.createdAt)}
                  </time>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
