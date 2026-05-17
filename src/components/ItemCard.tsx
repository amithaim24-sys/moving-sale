import Link from "next/link";
import Image from "next/image";
import PriceOrFreeBadge from "./PriceOrFreeBadge";
import type { ListingType } from "@/lib/types";

export type ItemCardData = {
  id: string;
  title: string;
  type: ListingType;
  priceIls: number | null;
  images: { url: string }[];
};

export default function ItemCard({ item, locale }: { item: ItemCardData; locale: string }) {
  const cover = item.images[0]?.url;
  return (
    <Link
      href={`/${locale}/items/${item.id}`}
      className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
    >
      <div className="relative aspect-square w-full bg-slate-100">
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
      <div className="flex items-center justify-between gap-2 p-3">
        <span className="truncate text-sm font-medium">{item.title}</span>
        <PriceOrFreeBadge type={item.type} priceIls={item.priceIls} />
      </div>
    </Link>
  );
}
