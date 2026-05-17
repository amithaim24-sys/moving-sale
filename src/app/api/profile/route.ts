import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const body = (await req.json()) as { name?: string; whatsappPhone?: string };
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) || null : undefined;
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
    data: { ...(name !== undefined ? { name } : {}), ...(phone !== undefined ? { whatsappPhone: phone } : {}) },
  });
  return NextResponse.json({ ok: true });
}
