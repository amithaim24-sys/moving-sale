import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseItemPayload } from "@/lib/validate";
import { destroyImage } from "@/lib/cloudinary";
import { csrfBlock } from "@/lib/security";

async function loadOwned(id: string, userId: string, isAdmin: boolean) {
  const item = await prisma.item.findUnique({
    where: { id },
    include: { images: true },
  });
  // Return 404 in both not-found and not-owned cases to avoid an ID-existence oracle.
  if (!item) return null;
  if (!isAdmin && item.ownerId !== userId) return null;
  return item;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.banned) return new NextResponse("Forbidden", { status: 403 });
  const { id } = await ctx.params;
  const found = await loadOwned(id, session.user.id, session.user.role === "ADMIN");
  if (!found) return new NextResponse("Not found", { status: 404 });

  let payload;
  try {
    payload = parseItemPayload(await req.json(), true);
  } catch (e) {
    return new NextResponse((e as Error).message, { status: 400 });
  }

  // An admin acting on someone else's item may only moderate its status — never rewrite
  // the seller's content or images. Strip everything but `status` in that case.
  const isOwner = found.ownerId === session.user.id;
  if (!isOwner) {
    payload = payload.status !== undefined ? { status: payload.status } : {};
  }

  // If the owner is trying to publish (status != DRAFT) they must have a WhatsApp phone.
  // Admins moderating someone else's item are exempt from the phone gate.
  if (payload.status && payload.status !== "DRAFT" && isOwner) {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { whatsappPhone: true, banned: true },
    });
    if (!me || me.banned) return new NextResponse("Forbidden", { status: 403 });
    if (!me.whatsappPhone) {
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
    // Record a "was" price only when the seller actually cut the price; clear it otherwise
    // so a later price increase doesn't leave a stale strikethrough.
    let previousPriceIls: number | null | undefined = undefined;
    if (payload.priceIls !== undefined && payload.priceIls !== found.priceIls) {
      previousPriceIls =
        payload.priceIls != null && payload.priceIls < (found.priceIls ?? Infinity)
          ? found.priceIls
          : null;
    }

    await tx.item.update({
      where: { id },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.type !== undefined ? { type: payload.type } : {}),
        ...(payload.condition !== undefined ? { condition: payload.condition } : {}),
        ...(payload.priceIls !== undefined ? { priceIls: payload.priceIls } : {}),
        ...(previousPriceIls !== undefined ? { previousPriceIls } : {}),
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
  } catch {
    return new NextResponse("Could not update item", { status: 500 });
  }

  // Best-effort Cloudinary cleanup after the DB commit (destroyImage swallows its own errors).
  await Promise.all(publicIdsToDestroy.map((publicId) => destroyImage(publicId)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.banned) return new NextResponse("Forbidden", { status: 403 });
  const { id } = await ctx.params;
  const found = await loadOwned(id, session.user.id, session.user.role === "ADMIN");
  if (!found) return new NextResponse("Not found", { status: 404 });

  try {
    await prisma.item.delete({ where: { id } });
  } catch {
    return new NextResponse("Could not delete item", { status: 500 });
  }
  // Delete the DB row first; only then drop the images. If this is interrupted the
  // worst case is an orphaned Cloudinary asset, not a broken listing with dead images.
  await Promise.all(found.images.map((img) => destroyImage(img.cloudinaryPublicId)));
  return NextResponse.json({ ok: true });
}
