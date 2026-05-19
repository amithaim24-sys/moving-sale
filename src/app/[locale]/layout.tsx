import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, dirOf, type Locale } from "@/i18n/config";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import SessionProvider from "@/components/SessionProvider";
import Toaster from "@/components/Toaster";
import { getOptionalUser } from "@/lib/guards";
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
  const user = await getOptionalUser();

  return (
    <html lang={locale} dir={dirOf(locale as Locale)} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <SessionProvider>
          <NextIntlClientProvider messages={messages} locale={locale}>
            <Toaster>
              <Header locale={locale as Locale} />
              <main className="mx-auto max-w-6xl px-3 py-6 pb-24 sm:px-4 md:pb-6">{children}</main>
              <BottomNav locale={locale} isLoggedIn={!!user} />
            </Toaster>
          </NextIntlClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
