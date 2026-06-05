import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { locales, dirOf, type Locale } from "@/i18n/config";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import SessionProvider from "@/components/SessionProvider";
import Toaster from "@/components/Toaster";
import { getOptionalUser } from "@/lib/guards";
import VisitTracker from "@/components/VisitTracker";
import ClientErrorLogger from "@/components/ClientErrorLogger";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(locales as readonly string[]).includes(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations("a11y");
  const tApp = await getTranslations("app");
  const user = await getOptionalUser();
  // Per-request CSP nonce minted in middleware; applied to our one inline script so it
  // runs under the strict (no 'unsafe-inline') script-src policy.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang={locale} dir={dirOf(locale as Locale)} suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none"
        >
          {t("skipToContent")}
        </a>
        <VisitTracker />
        <ClientErrorLogger />
        <SessionProvider>
          <NextIntlClientProvider messages={messages} locale={locale}>
            <Toaster>
              <Header locale={locale as Locale} />
              <main id="main-content" className="mx-auto max-w-6xl px-3 py-6 sm:px-4">{children}</main>
              <footer className="mx-auto max-w-6xl px-3 pb-28 pt-2 text-center text-xs text-slate-400 sm:px-4 dark:text-slate-500 md:pb-8">
                {tApp.rich("builtBy", {
                  link: (chunks) => (
                    <a
                      href="https://www.linkedin.com/in/or-caf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand underline-offset-2 hover:underline"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </footer>
              <BottomNav locale={locale} isLoggedIn={!!user} />
            </Toaster>
          </NextIntlClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
