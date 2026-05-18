import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const ALLOWED_FORMATS = "jpg,jpeg,png,webp,heic,heif";

export function signUpload(folder: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  // Pre-allocate the public_id so the client cannot collide with existing assets.
  const public_id = `${folder}/${randomUUID()}`;
  const paramsToSign = {
    timestamp,
    folder,
    public_id,
    allowed_formats: ALLOWED_FORMATS,
    overwrite: "false",
    resource_type: "image",
  };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET as string,
  );
  return {
    ...paramsToSign,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY as string,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME as string,
  };
}

export async function destroyImage(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // ignore — image may already be gone
  }
}
