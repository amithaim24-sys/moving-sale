import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csrfBlock, rateLimitBlock } from "@/lib/security";
import { canEditOwner } from "@/lib/collab";

// Confirm the caller may manage `itemId`'s waitlist, and that `wid` belongs to that
// item. Returns the item owner id when allowed, or null (caller should 404).
async function authorize(itemId: string, wid: string, userId: string) {
  const row = await prisma.waitlister.findUnique({
    where: { id: wid },
    select: { itemId: true, item: { select: { ownerId: true } } },
  });
  if (!row || row.itemId !== itemId) return null;
  if (!(await canEditOwner(userId, row.item.ownerId))) return null;
  return row;
}

// Mark a waitlister as notified (the owner just sent them the "it's ready" message).
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; wid: string }> }) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.banned) return new NextResponse("Forbidden", { status: 403 });

  const limited = rateLimitBlock(`waitlist-edit:${session.user.id}`, 60, 60_000);
  if (limited) return limited;

  const { id, wid } = await ctx.params;
  if (!(await authorize(id, wid, session.user.id))) return new NextResponse("Not found", { status: 404 });

  let body: { notified?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid body", { status: 400 });
  }
  // `notified: true` stamps now; `false` clears it (lets the owner re-flag someone).
  const notifiedAt = body.notified === false ? null : new Date();
  const updated = await prisma.waitlister.update({
    where: { id: wid },
    data: { notifiedAt },
    select: { id: true, notifiedAt: true },
  });
  return NextResponse.json(updated);
}

// Remove a waitlister from the item.
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string; wid: string }> }) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.banned) return new NextResponse("Forbidden", { status: 403 });

  const limited = rateLimitBlock(`waitlist-del:${session.user.id}`, 60, 60_000);
  if (limited) return limited;

  const { id, wid } = await ctx.params;
  if (!(await authorize(id, wid, session.user.id))) return new NextResponse("Not found", { status: 404 });

  await prisma.waitlister.delete({ where: { id: wid } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
