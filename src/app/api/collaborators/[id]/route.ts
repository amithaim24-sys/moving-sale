import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csrfBlock, rateLimitBlock } from "@/lib/security";

// Remove a collaborator from the current user's account. `id` is the Collaborator
// row id; only the account owner who created the grant may remove it.
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.banned) return new NextResponse("Forbidden", { status: 403 });

  const limited = rateLimitBlock(`collab-del:${session.user.id}`, 40, 60_000);
  if (limited) return limited;

  const { id } = await ctx.params;
  const row = await prisma.collaborator.findUnique({ where: { id }, select: { ownerId: true } });
  // Return 404 in both not-found and not-owned cases to avoid an id-existence oracle.
  if (!row || row.ownerId !== session.user.id) return new NextResponse("Not found", { status: 404 });

  try {
    await prisma.collaborator.delete({ where: { id } });
  } catch {
    return new NextResponse("Could not remove collaborator", { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
