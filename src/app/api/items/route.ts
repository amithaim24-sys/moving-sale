import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseItemPayload } from "@/lib/validate";
import { csrfBlock, rateLimitBlock } from "@/lib/security";
import { revalidateCatalog } from "@/lib/catalog";
import { logEvent, requestContext } from "@/lib/eventLog";
import { isSeller } from "@/lib/types";

export async function POST(req: Request) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const limited = rateLimitBlock(`item-create:${session.user.id}`, 20, 60_000);
  if (limited) return limited;

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { whatsappPhone: true, banned: true, store: { select: { id: true } } },
  });
  if (!me || me.banned || session.user.banned) return new NextResponse("Forbidden", { status: 403 });
  if (!isSeller(session.user.role)) return new NextResponse("Forbidden", { status: 403 });

  // A store owner's items are filed into their own store's catalog; everyone else's
  // land in the root catalog (storeId = null). This is what isolates each white-label
  // marketplace — the owner never has to pick a store, it follows from who they are.
  const storeId = me.store?.id ?? null;

  let payload;
  try {
    payload = parseItemPayload(await req.json());
  } catch (e) {
    return new NextResponse((e as Error).message, { status: 400 });
  }

  const requestedStatus = payload.status;
  const status =
    requestedStatus === "DRAFT" || !me.whatsappPhone
      ? "DRAFT"
      : (requestedStatus ?? "AVAILABLE");

  try {
    const item = await prisma.item.create({
      data: {
        ownerId: session.user.id,
        storeId,
        title: payload.title!,
        description: payload.description ?? "",
        type: payload.type!,
        category: payload.category ?? null,
        condition: payload.condition ?? null,
        priceIls: payload.priceIls ?? null,
        giveIfUnsold: payload.giveIfUnsold ?? false,
        status,
        images: payload.images
          ? {
              create: payload.images.map((img, idx) => ({
                cloudinaryPublicId: img.cloudinaryPublicId,
                url: img.url,
                sortOrder: idx,
              })),
            }
          : undefined,
      },
    });
    // A newly published listing should show up on the (cached) catalog right
    // away rather than after the 60s revalidate window. Drafts aren't listed,
    // so they don't need to bust the cache.
    if (status === "AVAILABLE") {
      revalidateCatalog(storeId);
    }
    const ctx = requestContext(req);
    void logEvent({
      event: "item_create",
      outcome: status === "DRAFT" ? "draft" : "published",
      userId: session.user.id,
      itemId: item.id,
      path: ctx.path,
      userAgent: ctx.userAgent,
      ip: ctx.ip,
      meta: { type: payload.type, status },
    });
    return NextResponse.json({ id: item.id });
  } catch (err) {
    const ctx = requestContext(req);
    void logEvent({
      event: "item_create",
      outcome: "error",
      level: "ERROR",
      userId: session.user.id,
      path: ctx.path,
      userAgent: ctx.userAgent,
      ip: ctx.ip,
      message: err instanceof Error ? err.message : String(err),
    });
    return new NextResponse("Could not create item", { status: 500 });
  }
}
