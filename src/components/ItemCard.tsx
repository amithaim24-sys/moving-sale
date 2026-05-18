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
  images: { url: string }[];
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
        </div>
        <div className="px-3 pt-3">
          <div className="truncate text-sm font-medium">{item.title}</div>
          {item.owner.city && (
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">{item.owner.city}</div>
          )}
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 p-3 pt-2">
        <PriceOrFreeBadge type={item.type} priceIls={item.priceIls} />
        <WhatsAppIconButton
          phone={item.owner.whatsappPhone}
          title={item.title}
          itemPath={itemPath}
        />
      </div>
    </article>
  );
}
