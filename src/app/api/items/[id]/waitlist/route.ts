import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csrfBlock, rateLimitBlock } from "@/lib/security";
import { canEditOwner } from "@/lib/collab";

// Add a future buyer (waitlister) to an item. Owner-managed: the owner — or a
// collaborator who co-manages the owner's items — types in a name and phone for
// someone who asked to be told when the item is available. These people have no
// account, so we just store the raw contact details against the item.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.banned) return new NextResponse("Forbidden", { status: 403 });

  const limited = rateLimitBlock(`waitlist-add:${session.user.id}`, 60, 60_000);
  if (limited) return limited;

  const { id } = await ctx.params;
  const item = await prisma.item.findUnique({ where: { id }, select: { ownerId: true } });
  // Return 404 in both not-found and not-allowed cases to avoid an id-existence oracle.
  if (!item || !(await canEditOwner(session.user.id, item.ownerId))) {
    return new NextResponse("Not found", { status: 404 });
  }

  let body: { name?: unknown; phone?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid body", { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 30) : "";
  if (!name) return new NextResponse("A name is required", { status: 400 });
  // Require at least a few digits — wa.me needs a real number to link to.
  if (phone.replace(/\D/g, "").length < 6) {
    return new NextResponse("A valid phone number is required", { status: 400 });
  }

  const created = await prisma.waitlister.create({
    data: { itemId: id, name, phone },
    select: { id: true, name: true, phone: true, notifiedAt: true, createdAt: true },
  });
  return NextResponse.json(created);
}
