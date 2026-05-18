import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { signUpload } from "@/lib/cloudinary";

export async function POST() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.banned) return new NextResponse("Forbidden", { status: 403 });
  const folder = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER || "moving-sale";
  return NextResponse.json(signUpload(folder));
}
