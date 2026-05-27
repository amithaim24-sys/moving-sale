import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { signUpload } from "@/lib/cloudinary";
import { csrfBlock, rateLimitBlock } from "@/lib/security";

export async function POST(req: Request) {
  const blocked = csrfBlock(req);
  if (blocked) return blocked;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.banned) return new NextResponse("Forbidden", { status: 403 });
  // Cap signature minting so one account can't loop this into unbounded Cloudinary uploads.
  const limited = rateLimitBlock(`sign:${session.user.id}`, 30, 60_000);
  if (limited) return limited;
  const folder = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER || "moving-sale";
  return NextResponse.json(signUpload(folder));
}
