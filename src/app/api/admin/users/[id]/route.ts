import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csrfBlock, rateLimitBlock } from "@/lib/security";
import { isOwner, isPlatformAdmin } from "@/lib/types";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  // Any platform admin (owner or delegated) may reach this; finer rules below.
  if (!session?.user || !isPlatformAdmin(session.user.role) || session.user.banned)
    return new NextResponse("Forbidden", { status: 403 });
  const limited = rateLimitBlock(`admin-user:${session.user.id}`, 60, 60_000);
  if (limited) return limited;

  const { id } = await ctx.params;
  let body: { role?: string; banned?: boolean };
  try {
    body = (await req.json()) as { role?: string; banned?: boolean };
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }
  const data: { role?: string; banned?: boolean } = {};
  // Roles grantable via the UI: USER or the delegated ADMIN. OWNER is provisioned via
  // the bootstrap allowlist, never granted through this endpoint.
  if (body.role === "USER" || body.role === "ADMIN") data.role = body.role;
  if (typeof body.banned === "boolean") data.banned = body.banned;

  if (Object.keys(data).length === 0) {
    return new NextResponse("Nothing to update", { status: 400 });
  }

  const requesterIsOwner = isOwner(session.user.role);

  // Only the owner can change roles (a delegated admin can't promote/demote — that
  // would let them escalate privileges).
  if (data.role !== undefined && !requesterIsOwner) {
    return new NextResponse("Only the owner can change roles", { status: 403 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, banned: true },
  });
  if (!target) return new NextResponse("Not found", { status: 404 });

  // A delegated admin may not act on the owner at all.
  if (!requesterIsOwner && target.role === "OWNER") {
    return new NextResponse("Cannot modify an owner", { status: 403 });
  }

  // Block self-destructive actions.
  if (id === session.user.id) {
    if (data.role !== undefined) return new NextResponse("Cannot change your own role", { status: 400 });
    if (data.banned === true) return new NextResponse("Cannot ban yourself", { status: 400 });
  }

  // Last-owner protection: never leave the platform with zero active owners.
  const losesOwner =
    (data.role !== undefined && target.role === "OWNER") ||
    (data.banned === true && target.role === "OWNER" && !target.banned);
  if (losesOwner) {
    const otherOwners = await prisma.user.count({
      where: { role: "OWNER", banned: false, id: { not: id } },
    });
    if (otherOwners === 0) {
      return new NextResponse("Cannot remove the last active owner", { status: 400 });
    }
  }

  await prisma.user.update({ where: { id }, data });

  // Invalidate active sessions when banning or demoting so the change takes effect immediately.
  if (data.banned === true || data.role === "USER") {
    await prisma.session.deleteMany({ where: { userId: id } });
  }

  return NextResponse.json({ ok: true });
}
