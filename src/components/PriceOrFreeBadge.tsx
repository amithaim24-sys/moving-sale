import { useTranslations } from "next-intl";
import type { ListingType } from "@/lib/types";

export default function PriceOrFreeBadge({
  type,
  priceIls,
  previousPriceIls,
}: {
  type: ListingType;
  priceIls?: number | null;
  previousPriceIls?: number | null;
}) {
  const t = useTranslations("item");
  const ta = useTranslations("a11y");

  if (type === "GIVE" || priceIls == null) {
    return (
      <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
        {t("free")}
      </span>
    );
  }

  const reduced = previousPriceIls != null && previousPriceIls > priceIls;

  if (reduced) {
    return (
      <span className="inline-flex items-center gap-1.5">
        {/* Visually struck-through old price; SR reads the accessible label instead */}
        <span
          aria-label={ta("previousPrice", { price: t("ils", { price: previousPriceIls }) })}
          className="text-xs text-slate-400 line-through dark:text-slate-500"
        >
          <span aria-hidden="true">{t("ils", { price: previousPriceIls })}</span>
        </span>
        <span
          aria-label={ta("currentPrice", { price: t("ils", { price: priceIls }) })}
          className="inline-block rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-900/60 dark:text-rose-100 dark:ring-rose-800"
        >
          <span aria-hidden="true">{t("ils", { price: priceIls })}</span>
        </span>
      </span>
    );
  }

  return (
    <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
      {t("ils", { price: priceIls })}
    </span>
  );
}
