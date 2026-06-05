import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimitBlock } from "@/lib/security";
import { logEvent, requestContext } from "@/lib/eventLog";
import { locales, defaultLocale, type Locale } from "@/i18n/config";

// Server-side WhatsApp hand-off. The seller's phone number never reaches the
// browser: the client links here, we look the number up server-side, build the
// wa.me deep link, and 302-redirect to it. This keeps the raw number out of the
// page HTML/JSON so it can't be scraped by crawlers or casual "view source".
//
// Every branch is logged to EventLog (event: "whatsapp_contact") so the admin can
// see *why* a click did or didn't reach WhatsApp — the silent redirects below are
// exactly what makes "the button did nothing" impossible to debug otherwise.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const localeParam = url.searchParams.get("locale");
  const locale: Locale = locales.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : defaultLocale;
  const home = new URL(`/${locale}`, url.origin);
  const reqCtx = requestContext(req);

  // Shared logging helper: same event, varying outcome/level. Fire-and-forget.
  const log = (
    outcome: string,
    level: "INFO" | "WARN" | "ERROR",
    userId: string | null,
    extra?: Record<string, unknown>,
  ) =>
    logEvent({
      event: "whatsapp_contact",
      outcome,
      level,
      itemId: id,
      userId,
      path: reqCtx.path,
      userAgent: reqCtx.userAgent,
      ip: reqCtx.ip,
      meta: { locale, referer: reqCtx.referer, ...extra },
    });

  // Contact is gated behind sign-in — anonymous visitors are never handed a number.
  const session = await auth();
  if (!session?.user) {
    await log("not_logged_in", "WARN", null);
    return NextResponse.redirect(new URL(`/${locale}/signin`, url.origin));
  }
  if (session.user.banned) {
    await log("banned", "WARN", session.user.id);
    return NextResponse.redirect(home);
  }

  // A single logged-in account could otherwise loop this endpoint across many ids to
  // harvest every seller's number. Cap the lookup rate per viewer.
  const limited = rateLimitBlock(`contact:${session.user.id}`, 40, 60_000);
  if (limited) {
    await log("rate_limited", "WARN", session.user.id);
    return limited;
  }

  let item;
  try {
    item = await prisma.item.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        owner: { select: { whatsappPhone: true, banned: true } },
      },
    });
  } catch (err) {
    // A DB hiccup here is the kind of thing that silently breaks the button.
    await log("error", "ERROR", session.user.id, {
      stage: "item_lookup",
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.redirect(home);
  }

  // Mirror the detail page's public-visibility rules so this can't become an oracle
  // for DRAFT/HIDDEN/banned-owner listings.
  const isAdmin = session.user.role === "ADMIN";
  const visible =
    !!item &&
    (isAdmin || (!item.owner.banned && item.status !== "HIDDEN" && item.status !== "DRAFT"));
  if (!visible || !item) {
    await log("not_visible", "WARN", session.user.id, {
      found: !!item,
      status: item?.status ?? null,
      ownerBanned: item?.owner.banned ?? null,
    });
    return NextResponse.redirect(home);
  }

  const phone = item.owner.whatsappPhone?.replace(/\D/g, "");
  if (!phone) {
    // No number on file — send the buyer back to the listing rather than to a broken link.
    await log("no_phone", "WARN", session.user.id, {
      rawPhonePresent: !!item.owner.whatsappPhone,
    });
    return NextResponse.redirect(new URL(`/${locale}/items/${item.id}`, url.origin));
  }

  // Record a high-intent contact click. Both writes are fire-and-forget: errors are
  // swallowed so analytics failures never block or degrade the buyer hand-off.
  await Promise.all([
    prisma.item.update({ where: { id: item.id }, data: { clickCount: { increment: 1 } } }).catch(() => {}),
    prisma.itemClick.create({ data: { itemId: item.id, userId: session.user.id, kind: "CONTACT" } }).catch(() => {}),
  ]);

  const itemUrl = `${url.origin}/${locale}/items/${item.id}`;
  const t = await getTranslations({ locale });
  const message = t("item.waMessage", { title: item.title, url: itemUrl });
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  // Success: log the masked number length so we can confirm a sane wa.me link was
  // built without ever persisting the seller's actual phone number.
  await log("redirect_wa", "INFO", session.user.id, { phoneDigits: phone.length });
  return NextResponse.redirect(waUrl);
}
