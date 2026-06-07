import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CatalogView from "@/components/CatalogView";
import StoreShareBar from "@/components/StoreShareBar";
import { getStoreBySlug } from "@/lib/stores";
import { getOptionalUser } from "@/lib/guards";
import { absoluteUrl } from "@/lib/url";
import type { Locale } from "@/i18n/config";

type SearchParams = Promise<{ type?: string; q?: string; category?: string }>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store || !store.active) return { title: "—" };
  return {
    title: store.name,
    description: store.tagline ?? undefined,
    robots: { index: false }, // white-label stores are private/share-by-link
  };
}

// Public catalog for one white-label store. Shows only that store's items. An
// inactive or unknown store 404s for everyone except its owner / a super-admin
// (so the owner can preview before going live).
export default async function StoreCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: SearchParams;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations();

  const [store, user] = await Promise.all([getStoreBySlug(slug), getOptionalUser()]);
  if (!store) notFound();

  const isOwner = !!user && user.id === store.ownerId;
  const isAdmin = !!user && user.role === "ADMIN";
  if (!store.active && !isOwner && !isAdmin) notFound();

  const basePath = `/${locale}/s/${store.slug}`;
  const publicUrl = await absoluteUrl(basePath);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold sm:text-3xl">{store.name}</h1>
          {!store.active && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              {t("store.inactiveBadge")}
            </span>
          )}
        </div>
        {store.tagline && (
          <p className="text-sm text-slate-600 dark:text-slate-400">{store.tagline}</p>
        )}
      </div>

      {(isOwner || isAdmin) && (
        <div className="space-y-2">
          <StoreShareBar url={publicUrl} />
          {(isOwner || isAdmin) && (
            <div className="flex flex-wrap gap-2">
              <Link href={`/${locale}/my/items/new`} className="btn-primary text-sm">
                + {t("nav.newItem")}
              </Link>
              <Link href={`/${locale}/s/${store.slug}/admin`} className="btn-secondary text-sm">
                {t("store.manageItems")}
              </Link>
            </div>
          )}
        </div>
      )}

      <CatalogView
        locale={locale}
        storeId={store.id}
        basePath={basePath}
        searchParams={sp}
        viewer={user}
        newItemHref={isOwner ? `/${locale}/my/items/new` : undefined}
      />
    </div>
  );
}
