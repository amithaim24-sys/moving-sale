import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import ItemCard from "@/components/ItemCard";
import type { Locale } from "@/i18n/config";

type SearchParams = Promise<{ type?: string; q?: string }>;

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { type, q } = await searchParams;
  const t = await getTranslations();

  const items = await prisma.item.findMany({
    where: {
      status: "AVAILABLE",
      ...(type === "SELL" || type === "GIVE" ? { type } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {}),
    },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("app.title")}</h1>
          <p className="text-slate-600">{t("app.tagline")}</p>
        </div>
        <Link href={`/${locale}/my/items/new`} className="btn-primary">
          + {t("nav.newItem")}
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-2" action={`/${locale}`}>
        <div className="flex rounded-lg border bg-white p-1 text-sm">
          {[
            { key: "", label: t("filter.all") },
            { key: "SELL", label: t("filter.sell") },
            { key: "GIVE", label: t("filter.give") },
          ].map((opt) => {
            const active = (type ?? "") === opt.key;
            return (
              <a
                key={opt.key}
                href={`/${locale}?${new URLSearchParams({ ...(opt.key ? { type: opt.key } : {}), ...(q ? { q } : {}) }).toString()}`}
                className={`px-3 py-1 rounded ${active ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {opt.label}
              </a>
            );
          })}
        </div>
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder={t("filter.searchPlaceholder")}
          className="field flex-1 min-w-[200px]"
        />
        {type && <input type="hidden" name="type" value={type} />}
      </form>

      {items.length === 0 ? (
        <p className="text-slate-500">{t("item.noItems")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              locale={locale}
              item={{
                id: item.id,
                title: item.title,
                type: item.type as "SELL" | "GIVE",
                priceIls: item.priceIls,
                images: item.images,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
