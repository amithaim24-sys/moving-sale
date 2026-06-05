import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csrfBlock, rateLimitBlock } from "@/lib/security";
import { logEvent, requestContext } from "@/lib/eventLog";

// Register the current user's interest in receiving a "give away if unsold" item
// for free. This replaces the WhatsApp contact for that fallback — the owner reviews
// the signup list on the site instead.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.banned) return new NextResponse("Forbidden", { status: 403 });

  const limited = rateLimitBlock(`signup:${session.user.id}`, 30, 60_000);
  if (limited) return limited;

  const { id } = await ctx.params;
  const item = await prisma.item.findUnique({
    where: { id },
    select: { id: true, ownerId: true, type: true, giveIfUnsold: true, status: true },
  });
  if (!item) return new NextResponse("Not found", { status: 404 });
  // Only SELL items flagged "give away if unsold" accept signups.
  if (item.type !== "SELL" || !item.giveIfUnsold || item.status === "HIDDEN") {
    return new NextResponse("This item is not accepting signups", { status: 400 });
  }
  if (item.ownerId === session.user.id) {
    return new NextResponse("You can't sign up for your own item", { status: 400 });
  }

  try {
    await prisma.giveIfUnsoldSignup.create({
      data: { itemId: item.id, userId: session.user.id },
    });
  } catch {
    // Unique constraint => already signed up. Idempotent success.
  }
  const rc = requestContext(req);
  void logEvent({
    event: "give_signup",
    outcome: "ok",
    userId: session.user.id,
    itemId: item.id,
    path: rc.path,
    userAgent: rc.userAgent,
    ip: rc.ip,
  });
  return NextResponse.json({ ok: true, signedUp: true });
}

// Withdraw a previous signup.
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.banned) return new NextResponse("Forbidden", { status: 403 });

  const limited = rateLimitBlock(`signup:${session.user.id}`, 30, 60_000);
  if (limited) return limited;

  const { id } = await ctx.params;
  await prisma.giveIfUnsoldSignup
    .delete({ where: { itemId_userId: { itemId: id, userId: session.user.id } } })
    .catch(() => {});
  return NextResponse.json({ ok: true, signedUp: false });
}
