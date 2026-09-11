import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "product-images";
const PUBLIC_URL_MARKER = `/object/public/${BUCKET}/`;

export async function uploadProductImage(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const webp = await sharp(buffer)
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const path = `${randomUUID()}.webp`;
  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, webp, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteProductImage(url: string): Promise<void> {
  const idx = url.indexOf(PUBLIC_URL_MARKER);
  if (idx === -1) return;
  const path = url.slice(idx + PUBLIC_URL_MARKER.length);
  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([path]);
}
