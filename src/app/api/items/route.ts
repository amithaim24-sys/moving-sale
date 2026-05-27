import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseItemPayload } from "@/lib/validate";
import { csrfBlock, rateLimitBlock } from "@/lib/security";

export async function POST(req: Request) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const limited = rateLimitBlock(`item-create:${session.user.id}`, 20, 60_000);
  if (limited) return limited;

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { whatsappPhone: true, banned: true },
  });
  if (!me || me.banned || session.user.banned) return new NextResponse("Forbidden", { status: 403 });

  let payload;
  try {
    payload = parseItemPayload(await req.json());
  } catch (e) {
    return new NextResponse((e as Error).message, { status: 400 });
  }

  const requestedStatus = payload.status;
  const status =
    requestedStatus === "DRAFT" || !me.whatsappPhone
      ? "DRAFT"
      : (requestedStatus ?? "AVAILABLE");

  try {
    const item = await prisma.item.create({
      data: {
        ownerId: session.user.id,
        title: payload.title!,
        description: payload.description ?? "",
        type: payload.type!,
        condition: payload.condition ?? null,
        priceIls: payload.priceIls ?? null,
        status,
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
  } catch {
    return new NextResponse("Could not create item", { status: 500 });
  }
}
