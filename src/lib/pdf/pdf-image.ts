import sharp from "sharp";

export interface PdfImageSource {
  data: Buffer;
  format: "png";
}

// @react-pdf/renderer's image decoder only understands JPEG/PNG/SVG, but
// every product image in this app is stored as WebP — so it must be
// transcoded before handing it to <Image>, or the PDF silently renders no
// image at all.
//
// Source images can be up to 1200x1200 but the PDF only ever displays them
// at 34x34, so we downscale here too — this keeps generation fast enough to
// stay under Vercel's serverless function time limit (10s on the Hobby
// plan) and keeps the emailed PDF's attachment size down.
const PDF_THUMBNAIL_SIZE = 120;

export async function toPdfImageSource(url: string): Promise<PdfImageSource | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const png = await sharp(buffer)
      .resize(PDF_THUMBNAIL_SIZE, PDF_THUMBNAIL_SIZE, { fit: "cover" })
      .png()
      .toBuffer();
    return { data: png, format: "png" };
  } catch (err) {
    console.error("Không chuyển đổi được ảnh cho PDF:", url, err);
    return null;
  }
}
