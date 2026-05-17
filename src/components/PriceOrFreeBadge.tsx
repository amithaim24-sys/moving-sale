import { useTranslations } from "next-intl";
import type { ListingType } from "@/lib/types";

export default function PriceOrFreeBadge({
  type,
  priceIls,
}: {
  type: ListingType;
  priceIls?: number | null;
}) {
  const t = useTranslations("item");
  if (type === "GIVE" || priceIls == null) {
    return (
      <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
        {t("free")}
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
      {t("ils", { price: priceIls })}
    </span>
  );
}
