import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csrfBlock, rateLimitBlock } from "@/lib/security";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.banned) return new NextResponse("Forbidden", { status: 403 });
  // Likes are cheap DB writes a single account could otherwise loop across many item ids;
  // cap the toggle rate to blunt write-amplification abuse.
  const limited = rateLimitBlock(`like:${session.user.id}`, 60, 60_000);
  if (limited) return limited;
  const { id } = await ctx.params;

  // Only allow liking items the viewer can actually see, mirroring the detail page's
  // visibility rules. Otherwise the endpoint becomes an oracle for the existence of
  // DRAFT/HIDDEN/banned-owner listings (200 vs 404) and lets users inflate engagement
  // on non-public items. The owner may like their own draft; admins may like anything.
  const item = await prisma.item.findUnique({
    where: { id },
    select: { ownerId: true, status: true, owner: { select: { banned: true } } },
  });
  const isAdmin = session.user.role === "ADMIN";
  const isOwner = !!item && item.ownerId === session.user.id;
  const visible =
    !!item &&
    (isAdmin ||
      (!item.owner.banned &&
        item.status !== "HIDDEN" &&
        (item.status !== "DRAFT" || isOwner)));
  if (!visible) return new NextResponse("Not found", { status: 404 });

  try {
    await prisma.itemLike.upsert({
      where: { userId_itemId: { userId: session.user.id, itemId: id } },
      update: {},
      create: { userId: session.user.id, itemId: id },
    });
  } catch {
    // The item was deleted between the user's view and this click (FK violation), or
    // a concurrent like landed first. Either way there's nothing to surface.
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.json({ liked: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.banned) return new NextResponse("Forbidden", { status: 403 });
  const limited = rateLimitBlock(`like:${session.user.id}`, 60, 60_000);
  if (limited) return limited;
  const { id } = await ctx.params;

  await prisma.itemLike.deleteMany({
    where: { userId: session.user.id, itemId: id },
  });
  return NextResponse.json({ liked: false });
}
