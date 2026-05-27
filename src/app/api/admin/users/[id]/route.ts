import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csrfBlock } from "@/lib/security";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN" || session.user.banned)
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = await ctx.params;
  let body: { role?: string; banned?: boolean };
  try {
    body = (await req.json()) as { role?: string; banned?: boolean };
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }
  const data: { role?: string; banned?: boolean } = {};
  if (body.role === "USER" || body.role === "ADMIN") data.role = body.role;
  if (typeof body.banned === "boolean") data.banned = body.banned;

  if (Object.keys(data).length === 0) {
    return new NextResponse("Nothing to update", { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, banned: true },
  });
  if (!target) return new NextResponse("Not found", { status: 404 });

  // Block self-destructive actions.
  if (id === session.user.id) {
    if (data.role === "USER") return new NextResponse("Cannot demote yourself", { status: 400 });
    if (data.banned === true) return new NextResponse("Cannot ban yourself", { status: 400 });
  }

  // Last-admin protection: if this change would leave zero unbanned admins, refuse.
  const losesAdmin =
    (data.role === "USER" && target.role === "ADMIN") ||
    (data.banned === true && target.role === "ADMIN" && !target.banned);
  if (losesAdmin) {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", banned: false, id: { not: id } },
    });
    if (otherAdmins === 0) {
      return new NextResponse("Cannot remove the last active admin", { status: 400 });
    }
  }

  await prisma.user.update({ where: { id }, data });

  // Invalidate active sessions when banning or demoting so the change takes effect immediately.
  if (data.banned === true || data.role === "USER") {
    await prisma.session.deleteMany({ where: { userId: id } });
  }

  return NextResponse.json({ ok: true });
}
