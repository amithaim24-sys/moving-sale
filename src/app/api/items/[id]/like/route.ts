import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  const item = await prisma.item.findUnique({ where: { id }, select: { id: true } });
  if (!item) return new NextResponse("Not found", { status: 404 });

  await prisma.itemLike.upsert({
    where: { userId_itemId: { userId: session.user.id, itemId: id } },
    update: {},
    create: { userId: session.user.id, itemId: id },
  });
  return NextResponse.json({ liked: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  await prisma.itemLike.deleteMany({
    where: { userId: session.user.id, itemId: id },
  });
  return NextResponse.json({ liked: false });
}
