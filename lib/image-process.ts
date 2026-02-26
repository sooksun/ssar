/**
 * PRD 3.1: รูปภาพ resize ด้านยาวไม่เกิน 1028px (คงอัตราส่วน) + บีบอัด
 */

const MAX_LONGEST_SIDE_PX = 1028;
const JPEG_QUALITY = 85;
const PNG_COMPRESSION = 8; // 0-9, 9 = max compress
const WEBP_QUALITY = 85;

export type ImageProcessResult = { buffer: Buffer; mimeType: string; width?: number; height?: number };

/**
 * Resize รูปภาพให้ด้านยาวไม่เกิน 1028px และบีบอัด แล้วคืน buffer
 * รองรับ jpeg, png, gif, webp
 */
export async function processImage(
  inputBuffer: Buffer,
  mimeType: string
): Promise<ImageProcessResult | null> {
  try {
    const sharp = (await import('sharp')).default;
    const mime = mimeType.toLowerCase();

    let pipeline = sharp(inputBuffer);
    const meta = await pipeline.metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w <= 0 || h <= 0) return null;

    const scale = Math.min(1, MAX_LONGEST_SIDE_PX / Math.max(w, h));
    const newW = Math.round(w * scale);
    const newH = Math.round(h * scale);

    pipeline = pipeline.resize(newW, newH, { fit: 'inside', withoutEnlargement: true });

    if (mime.includes('jpeg') || mime.includes('jpg')) {
      const buf = await pipeline.jpeg({ quality: JPEG_QUALITY }).toBuffer();
      return { buffer: buf, mimeType: 'image/jpeg', width: newW, height: newH };
    }
    if (mime.includes('png')) {
      const buf = await pipeline.png({ compressionLevel: PNG_COMPRESSION }).toBuffer();
      return { buffer: buf, mimeType: 'image/png', width: newW, height: newH };
    }
    if (mime.includes('webp')) {
      const buf = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
      return { buffer: buf, mimeType: 'image/webp', width: newW, height: newH };
    }
    if (mime.includes('gif')) {
      const buf = await pipeline.gif().toBuffer();
      return { buffer: buf, mimeType: 'image/gif', width: newW, height: newH };
    }

    return null;
  } catch {
    return null;
  }
}
