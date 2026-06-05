import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseItemPayload } from "@/lib/validate";
import { destroyImage } from "@/lib/cloudinary";
import { csrfBlock, rateLimitBlock } from "@/lib/security";
import { canEditOwner } from "@/lib/collab";
import { logEvent, requestContext } from "@/lib/eventLog";

// Load an item the caller is allowed to act on. `isFullEditor` is true for the owner
// and for collaborators the owner has invited — they may edit content and images.
// An admin who is neither owner nor collaborator may only moderate status.
async function loadEditable(id: string, userId: string, isAdmin: boolean) {
  const item = await prisma.item.findUnique({
    where: { id },
    include: { images: true },
  });
  // Return 404 in both not-found and not-allowed cases to avoid an ID-existence oracle.
  if (!item) return null;
  const isFullEditor = await canEditOwner(userId, item.ownerId);
  if (!isFullEditor && !isAdmin) return null;
  return { item, isFullEditor };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.banned) return new NextResponse("Forbidden", { status: 403 });
  // Edits trigger DB writes plus Cloudinary deletes; cap them per account.
  const limited = rateLimitBlock(`item-edit:${session.user.id}`, 40, 60_000);
  if (limited) return limited;
  const { id } = await ctx.params;
  const loaded = await loadEditable(id, session.user.id, session.user.role === "ADMIN");
  if (!loaded) return new NextResponse("Not found", { status: 404 });
  const found = loaded.item;

  let payload;
  try {
    payload = parseItemPayload(await req.json(), true);
  } catch (e) {
    return new NextResponse((e as Error).message, { status: 400 });
  }

  // An admin acting on an item they don't own/collaborate on may only moderate its
  // status — never rewrite the seller's content or images. Strip all but `status`.
  if (!loaded.isFullEditor) {
    payload = payload.status !== undefined ? { status: payload.status } : {};
  }

  // Publishing (status != DRAFT) requires the OWNER to have a WhatsApp phone — the
  // contact button uses the owner's number, not the editing collaborator's. Admins
  // moderating someone else's item are exempt from the phone gate.
  if (payload.status && payload.status !== "DRAFT" && loaded.isFullEditor) {
    const owner = await prisma.user.findUnique({
      where: { id: found.ownerId },
      select: { whatsappPhone: true, banned: true },
    });
    if (!owner || owner.banned) return new NextResponse("Forbidden", { status: 403 });
    if (!owner.whatsappPhone) {
      // Silently downgrade to DRAFT rather than rejecting.
      payload.status = "DRAFT";
    }
  }

  // Cloudinary destroys are network I/O; collect them and run after the DB transaction
  // commits so a slow external call can't time out the transaction or leave DB/Cloudinary
  // inconsistent.
  const publicIdsToDestroy: string[] = [];

  try {
    await prisma.$transaction(async (tx) => {
    // The struck-through "was" price is opt-in: the seller ticks "mark as price
    // reduction" in the form. Lowering the price alone is not enough. We record a
    // previous price only when they ask for it AND there's a higher price to show;
    // otherwise we clear it so no stale strikethrough lingers. `undefined` leaves the
    // column untouched (e.g. an admin moderating status without touching price).
    let previousPriceIls: number | null | undefined = undefined;
    if (payload.markReduced !== undefined || payload.priceIls !== undefined) {
      const newPrice = payload.priceIls !== undefined ? payload.priceIls : found.priceIls;
      if (payload.markReduced && newPrice != null) {
        // Prefer the price we're cutting from on this edit; otherwise keep an already
        // recorded previous price as long as it's still higher than the new price.
        const cutFrom = found.priceIls != null && found.priceIls > newPrice ? found.priceIls : null;
        const kept =
          found.previousPriceIls != null && found.previousPriceIls > newPrice
            ? found.previousPriceIls
            : null;
        previousPriceIls = cutFrom ?? kept;
      } else {
        previousPriceIls = null;
      }
    }

    await tx.item.update({
      where: { id },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.type !== undefined ? { type: payload.type } : {}),
        ...(payload.category !== undefined ? { category: payload.category } : {}),
        ...(payload.condition !== undefined ? { condition: payload.condition } : {}),
        ...(payload.priceIls !== undefined ? { priceIls: payload.priceIls } : {}),
        ...(previousPriceIls !== undefined ? { previousPriceIls } : {}),
        ...(payload.giveIfUnsold !== undefined ? { giveIfUnsold: payload.giveIfUnsold } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
      },
    });

    if (payload.images) {
      const incoming = new Set(payload.images.map((i) => i.cloudinaryPublicId));
      const toDelete = found.images.filter((i) => !incoming.has(i.cloudinaryPublicId));
      for (const img of toDelete) {
        await tx.itemImage.delete({ where: { id: img.id } });
        publicIdsToDestroy.push(img.cloudinaryPublicId);
      }
      const existingIds = new Set(found.images.map((i) => i.cloudinaryPublicId));
      for (let idx = 0; idx < payload.images.length; idx++) {
        const img = payload.images[idx];
        if (existingIds.has(img.cloudinaryPublicId)) {
          await tx.itemImage.updateMany({
            where: { itemId: id, cloudinaryPublicId: img.cloudinaryPublicId },
            data: { sortOrder: idx },
          });
        } else {
          await tx.itemImage.create({
            data: { itemId: id, cloudinaryPublicId: img.cloudinaryPublicId, url: img.url, sortOrder: idx },
          });
        }
      }
    }
    });
  } catch (err) {
    const ec = requestContext(req);
    void logEvent({
      event: "item_update",
      outcome: "error",
      level: "ERROR",
      userId: session.user.id,
      itemId: id,
      path: ec.path,
      userAgent: ec.userAgent,
      ip: ec.ip,
      message: err instanceof Error ? err.message : String(err),
    });
    return new NextResponse("Could not update item", { status: 500 });
  }

  // Best-effort Cloudinary cleanup after the DB commit (destroyImage swallows its own errors).
  await Promise.all(publicIdsToDestroy.map((publicId) => destroyImage(publicId)));

  const ec = requestContext(req);
  void logEvent({
    event: "item_update",
    outcome: "ok",
    userId: session.user.id,
    itemId: id,
    path: ec.path,
    userAgent: ec.userAgent,
    ip: ec.ip,
    meta: { status: payload.status ?? null, fullEditor: loaded.isFullEditor },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.banned) return new NextResponse("Forbidden", { status: 403 });
  const limited = rateLimitBlock(`item-delete:${session.user.id}`, 40, 60_000);
  if (limited) return limited;
  const { id } = await ctx.params;
  const loaded = await loadEditable(id, session.user.id, session.user.role === "ADMIN");
  if (!loaded) return new NextResponse("Not found", { status: 404 });
  const found = loaded.item;

  try {
    await prisma.item.delete({ where: { id } });
  } catch (err) {
    const ec = requestContext(req);
    void logEvent({
      event: "item_delete",
      outcome: "error",
      level: "ERROR",
      userId: session.user.id,
      itemId: id,
      path: ec.path,
      userAgent: ec.userAgent,
      ip: ec.ip,
      message: err instanceof Error ? err.message : String(err),
    });
    return new NextResponse("Could not delete item", { status: 500 });
  }
  // Delete the DB row first; only then drop the images. If this is interrupted the
  // worst case is an orphaned Cloudinary asset, not a broken listing with dead images.
  await Promise.all(found.images.map((img) => destroyImage(img.cloudinaryPublicId)));
  const ec = requestContext(req);
  void logEvent({
    event: "item_delete",
    outcome: "ok",
    userId: session.user.id,
    itemId: id,
    path: ec.path,
    userAgent: ec.userAgent,
    ip: ec.ip,
  });
  return NextResponse.json({ ok: true });
}
