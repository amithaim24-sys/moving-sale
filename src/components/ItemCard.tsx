import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import PriceOrFreeBadge from "./PriceOrFreeBadge";
import WhatsAppIconButton from "./WhatsAppIconButton";
import LikeButton from "./LikeButton";
import ConditionBadge from "./ConditionBadge";
import type { ListingType } from "@/lib/types";

export type ItemCardData = {
  id: string;
  title: string;
  type: ListingType;
  priceIls: number | null;
  previousPriceIls: number | null;
  giveIfUnsold: boolean;
  condition: string | null;
  images: { url: string }[];
  imageCount: number;
  owner: { name: string | null; hasPhone: boolean; city: string | null };
};

export default function ItemCard({
  item,
  locale,
  liked,
  isLoggedIn,
  basePath,
  priority = false,
}: {
  item: ItemCardData;
  locale: string;
  liked: boolean;
  isLoggedIn: boolean;
  // Path the item links live under. Defaults to the main site; a store catalog
  // passes `/<locale>/s/<slug>` so item detail stays inside the store.
  basePath?: string;
  // Eagerly load + prioritize the cover image for the first row of cards so the
  // catalog LCP isn't gated behind lazy-loading. Set by the grid for the items
  // most likely above the fold.
  priority?: boolean;
}) {
  const t = useTranslations("item");
  const cover = item.images[0]?.url;
  const itemPath = `${basePath ?? `/${locale}`}/items/${item.id}`;
  const showGiveBadge = item.type === "SELL" && item.giveIfUnsold;
  // Only NEW gets flagged in the catalog — it's the headline state buyers scan for.
  const showNewBadge = item.condition === "NEW";

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md active:scale-[0.98] dark:bg-slate-900 dark:ring-slate-800">
      <div className="absolute end-2 top-2 z-10">
        <LikeButton
          itemId={item.id}
          initiallyLiked={liked}
          isLoggedIn={isLoggedIn}
          locale={locale}
        />
      </div>
      {showNewBadge && (
        <div className="absolute start-2 top-2 z-10">
          <ConditionBadge condition="NEW" />
        </div>
      )}
      <Link href={itemPath} className="block">
        <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800">
          {cover ? (
            <Image
              src={cover}
              alt={item.title}
              fill
              sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
              className="object-cover transition group-hover:scale-[1.02]"
              priority={priority}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">—</div>
          )}
          {item.imageCount > 1 && (
            <span className="absolute end-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                <path d="M4 7h3l2-2h6l2 2h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2zm8 11a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" />
              </svg>
              {item.imageCount}
            </span>
          )}
        </div>
        <div className="px-3 pt-3">
          <div className="truncate text-sm font-medium">{item.title}</div>
          {item.owner.city && (
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">{item.owner.city}</div>
          )}
          {showGiveBadge && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <span aria-hidden="true">🎁</span> {t("giveIfUnsold.badge")}
            </span>
          )}
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 p-3 pt-2">
        <PriceOrFreeBadge
          type={item.type}
          priceIls={item.priceIls}
          previousPriceIls={item.previousPriceIls}
        />
        <WhatsAppIconButton
          itemId={item.id}
          hasPhone={item.owner.hasPhone}
          isLoggedIn={isLoggedIn}
          locale={locale}
        />
      </div>
    </article>
  );
}
