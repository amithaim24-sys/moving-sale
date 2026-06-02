import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimitBlock } from "@/lib/security";
import { locales, defaultLocale, type Locale } from "@/i18n/config";

// Server-side WhatsApp hand-off. The seller's phone number never reaches the
// browser: the client links here, we look the number up server-side, build the
// wa.me deep link, and 302-redirect to it. This keeps the raw number out of the
// page HTML/JSON so it can't be scraped by crawlers or casual "view source".
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const localeParam = url.searchParams.get("locale");
  const locale: Locale = locales.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : defaultLocale;
  const home = new URL(`/${locale}`, url.origin);

  // Contact is gated behind sign-in — anonymous visitors are never handed a number.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL(`/${locale}/signin`, url.origin));
  }
  if (session.user.banned) {
    return NextResponse.redirect(home);
  }

  // A single logged-in account could otherwise loop this endpoint across many ids to
  // harvest every seller's number. Cap the lookup rate per viewer.
  const limited = rateLimitBlock(`contact:${session.user.id}`, 40, 60_000);
  if (limited) return limited;

  const item = await prisma.item.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      owner: { select: { whatsappPhone: true, banned: true } },
    },
  });

  // Mirror the detail page's public-visibility rules so this can't become an oracle
  // for DRAFT/HIDDEN/banned-owner listings.
  const isAdmin = session.user.role === "ADMIN";
  const visible =
    !!item &&
    (isAdmin || (!item.owner.banned && item.status !== "HIDDEN" && item.status !== "DRAFT"));
  if (!visible) {
    return NextResponse.redirect(home);
  }

  const phone = item.owner.whatsappPhone?.replace(/\D/g, "");
  if (!phone) {
    // No number on file — send the buyer back to the listing rather than to a broken link.
    return NextResponse.redirect(new URL(`/${locale}/items/${item.id}`, url.origin));
  }

  const itemUrl = `${url.origin}/${locale}/items/${item.id}`;
  const t = await getTranslations({ locale });
  const message = t("item.waMessage", { title: item.title, url: itemUrl });
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  return NextResponse.redirect(waUrl);
}
