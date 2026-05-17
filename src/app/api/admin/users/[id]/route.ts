import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = await ctx.params;
  const body = (await req.json()) as { role?: string; banned?: boolean };
  const data: { role?: string; banned?: boolean } = {};
  if (body.role === "USER" || body.role === "ADMIN") data.role = body.role;
  if (typeof body.banned === "boolean") data.banned = body.banned;

  if (id === session.user.id && data.role === "USER") {
    return new NextResponse("Cannot demote yourself", { status: 400 });
  }

  await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
