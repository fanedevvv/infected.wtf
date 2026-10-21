import path from "node:path";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const PUBLIC_DIR = path.join(process.cwd(), "public");

/** Loads an image from /public as a PNG data URL (first frame for GIFs), resized to fit `width`x`height`.
 *  Satori can't decode GIF/WebP reliably, so everything goes through sharp. Returns null if missing/unreadable. */
export async function publicImageDataUrl(relPath: string | null | undefined, width: number, height: number, fit: "cover" | "contain" = "cover"): Promise<string | null> {
  if (!relPath) return null;
  const abs = path.join(PUBLIC_DIR, relPath.replace(/^\/+/, ""));
  if (!abs.startsWith(PUBLIC_DIR + path.sep)) return null;
  try {
    const buf = await readFile(abs);
    const png = await sharp(buf, { animated: false }).resize(width, height, { fit, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}
