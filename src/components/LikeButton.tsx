"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function LikeButton({
  itemId,
  initiallyLiked,
  isLoggedIn,
  locale,
  size = "md",
}: {
  itemId: string;
  initiallyLiked: boolean;
  isLoggedIn: boolean;
  locale: string;
  size?: "sm" | "md" | "lg";
}) {
  const router = useRouter();
  const t = useTranslations("item");
  const [liked, setLiked] = useState(initiallyLiked);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      router.push(`/${locale}/signin`);
      return;
    }
    setBusy(true);
    const next = !liked;
    setLiked(next); // optimistic
    const res = await fetch(`/api/items/${itemId}/like`, {
      method: next ? "POST" : "DELETE",
    });
    if (!res.ok) setLiked(!next); // revert
    setBusy(false);
  }

  const dim = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const iconDim = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={liked}
      aria-label={liked ? t("unlike") : t("like")}
      title={liked ? t("unlike") : t("like")}
      className={`inline-flex ${dim} items-center justify-center rounded-full bg-white/90 shadow ring-1 ring-slate-200 transition hover:scale-105 dark:bg-slate-900/90 dark:ring-slate-700`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`${iconDim} transition-colors ${
          liked ? "fill-rose-500 stroke-rose-500" : "fill-none stroke-slate-500 dark:stroke-slate-300"
        }`}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    </button>
  );
}
