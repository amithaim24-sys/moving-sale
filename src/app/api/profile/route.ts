import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csrfBlock, rateLimitBlock } from "@/lib/security";

export async function PATCH(req: Request) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.banned) return new NextResponse("Forbidden", { status: 403 });
  const limited = rateLimitBlock(`profile:${session.user.id}`, 20, 60_000);
  if (limited) return limited;

  let body: { name?: string; whatsappPhone?: string; city?: string };
  try {
    body = (await req.json()) as { name?: string; whatsappPhone?: string; city?: string };
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) || null : undefined;
  const city = typeof body.city === "string" ? body.city.trim().slice(0, 80) || null : undefined;
  const rawPhone = typeof body.whatsappPhone === "string" ? body.whatsappPhone.trim() : undefined;

  let phone: string | null | undefined = undefined;
  if (rawPhone !== undefined) {
    if (rawPhone === "") {
      phone = null;
    } else {
      const cleaned = rawPhone.replace(/[^\d+]/g, "");
      if (!/^\+?\d{7,15}$/.test(cleaned)) {
        return new NextResponse("Invalid phone format", { status: 400 });
      }
      phone = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(city !== undefined ? { city } : {}),
      ...(phone !== undefined ? { whatsappPhone: phone } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}
