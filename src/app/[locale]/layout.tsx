import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, dirOf, type Locale } from "@/i18n/config";
import Header from "@/components/Header";
import SessionProvider from "@/components/SessionProvider";
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

  return (
    <html lang={locale} dir={dirOf(locale as Locale)}>
      <body>
        <SessionProvider>
          <NextIntlClientProvider messages={messages} locale={locale}>
            <Header locale={locale as Locale} />
            <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          </NextIntlClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
