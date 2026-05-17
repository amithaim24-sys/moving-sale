"use client";

import { usePathname, useRouter } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";

export default function LanguageToggle({ currentLocale }: { currentLocale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(next: Locale) {
    if (next === currentLocale) return;
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/") || `/${next}`);
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchTo(loc)}
          className={`px-2 py-1 rounded ${
            loc === currentLocale ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {loc === "he" ? "עב" : "EN"}
        </button>
      ))}
    </div>
  );
}
