import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseItemPayload } from "@/lib/validate";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { whatsappPhone: true, banned: true },
  });
  if (!me || me.banned) return new NextResponse("Forbidden", { status: 403 });
  if (!me.whatsappPhone) return new NextResponse("Set WhatsApp phone first", { status: 400 });

  let payload;
  try {
    payload = parseItemPayload(await req.json());
  } catch (e) {
    return new NextResponse((e as Error).message, { status: 400 });
  }

  const item = await prisma.item.create({
    data: {
      ownerId: session.user.id,
      title: payload.title!,
      description: payload.description!,
      type: payload.type!,
      priceIls: payload.priceIls ?? null,
      status: "AVAILABLE",
      images: payload.images
        ? {
            create: payload.images.map((img, idx) => ({
              cloudinaryPublicId: img.cloudinaryPublicId,
              url: img.url,
              sortOrder: idx,
            })),
          }
        : undefined,
    },
  });
  return NextResponse.json({ id: item.id });
}
