import Link from "next/link";
import Image from "next/image";
import PriceOrFreeBadge from "./PriceOrFreeBadge";
import WhatsAppIconButton from "./WhatsAppIconButton";
import LikeButton from "./LikeButton";
import type { ListingType } from "@/lib/types";

export type ItemCardData = {
  id: string;
  title: string;
  type: ListingType;
  priceIls: number | null;
  previousPriceIls: number | null;
  images: { url: string }[];
  imageCount: number;
  owner: { name: string | null; whatsappPhone: string | null; city: string | null };
};

export default function ItemCard({
  item,
  locale,
  liked,
  isLoggedIn,
}: {
  item: ItemCardData;
  locale: string;
  liked: boolean;
  isLoggedIn: boolean;
}) {
  const cover = item.images[0]?.url;
  const itemPath = `/${locale}/items/${item.id}`;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md dark:bg-slate-900 dark:ring-slate-800">
      <div className="absolute end-2 top-2 z-10">
        <LikeButton
          itemId={item.id}
          initiallyLiked={liked}
          isLoggedIn={isLoggedIn}
          locale={locale}
        />
      </div>
      <Link href={itemPath} className="block">
        <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800">
          {cover ? (
            <Image
              src={cover}
              alt={item.title}
              fill
              sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
              className="object-cover transition group-hover:scale-[1.02]"
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
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 p-3 pt-2">
        <PriceOrFreeBadge
          type={item.type}
          priceIls={item.priceIls}
          previousPriceIls={item.previousPriceIls}
        />
        <WhatsAppIconButton
          phone={item.owner.whatsappPhone}
          title={item.title}
          itemPath={itemPath}
        />
      </div>
    </article>
  );
}
