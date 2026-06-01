"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Spinner from "./Spinner";
import { useToast } from "./Toaster";

// Website sign-up for a "give away if unsold" item, used in place of WhatsApp.
// The owner reviews signups on the site; the registrant can withdraw.
export default function GiveIfUnsoldSignupButton({
  itemId,
  isLoggedIn,
  initiallySignedUp,
  locale,
}: {
  itemId: string;
  isLoggedIn: boolean;
  initiallySignedUp: boolean;
  locale: string;
}) {
  const t = useTranslations("signups");
  const router = useRouter();
  const toast = useToast();
  const [signedUp, setSignedUp] = useState(initiallySignedUp);
  const [busy, setBusy] = useState(false);

  if (!isLoggedIn) {
    return (
      <Link
        href={`/${locale}/signin`}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 bg-white px-6 py-3 text-base font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:bg-transparent dark:text-emerald-300"
      >
        {t("signInToSignUp")}
      </Link>
    );
  }

  async function toggle() {
    setBusy(true);
    const next = !signedUp;
    try {
      const res = await fetch(`/api/items/${itemId}/signup`, {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        toast.show((await res.text().catch(() => "")) || t("error"), "error");
        return;
      }
      setSignedUp(next);
      toast.show(next ? t("signedUpToast") : t("withdrawnToast"));
      router.refresh();
    } catch {
      toast.show(t("error"), "error");
    } finally {
      setBusy(false);
    }
  }

  if (signedUp) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          ✓ {t("signedUpNote")}
        </p>
        <button
          onClick={toggle}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 bg-white px-6 py-3 text-base font-semibold text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-60 dark:bg-transparent dark:text-emerald-300"
        >
          {busy && <Spinner />}
          {t("withdraw")}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
    >
      {busy && <Spinner />}
      🎁 {t("signUpCta")}
    </button>
  );
}
