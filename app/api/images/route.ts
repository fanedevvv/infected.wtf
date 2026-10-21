import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { IMAGE_EXT, IMAGE_MAX_BYTES, imageLinks, imageQuota, newImageKey } from "@/lib/image-host";

const DIR = path.join(process.cwd(), "public", "uploads", "i");
const SHARP_FORMAT: Record<string, string> = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

async function usage(userId: number) {
  const agg = await prisma.hostedImage.aggregate({ where: { userId }, _sum: { size: true }, _count: true });
  return { used: agg._sum.size ?? 0, count: agg._count };
}

function serialize(img: { id: number; key: string; path: string; name: string; mime: string; size: number; width: number | null; height: number | null; views: number; createdAt: Date }) {
  return { id: img.id, key: img.key, name: img.name, mime: img.mime, size: img.size, width: img.width, height: img.height, views: img.views, createdAt: img.createdAt.toISOString(), ...imageLinks(img) };
}

export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") || "0", 10) || 0);
  const [images, u] = await Promise.all([
    prisma.hostedImage.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, skip: offset, take: 48 }),
    usage(me.id),
  ]);
  return NextResponse.json({ success: true, images: images.map(serialize), used: u.used, count: u.count, quota: imageQuota(me), maxBytes: IMAGE_MAX_BYTES });
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  if (me.banned) return NextResponse.json({ success: false, error: "Your account is suspended." }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ success: false, error: "No image received." }, { status: 400 });
  if (file.size > IMAGE_MAX_BYTES) return NextResponse.json({ success: false, error: "Images can be at most 10 MB." }, { status: 400 });

  const input = Buffer.from(await file.arrayBuffer());
  let meta: sharp.Metadata;
  try {
    meta = await sharp(input, { animated: true }).metadata();
  } catch {
    return NextResponse.json({ success: false, error: "That file isn't a supported image." }, { status: 400 });
  }
  // Trust the decoded format, not the browser-supplied MIME type.
  const mime = meta.format ? SHARP_FORMAT[meta.format] : undefined;
  if (!mime) return NextResponse.json({ success: false, error: "Only PNG, JPG, WEBP and GIF images are supported." }, { status: 400 });

  // GIFs are stored as-is to keep animation; everything else is re-encoded, which drops EXIF/GPS metadata.
  let output: Buffer = input;
  if (meta.format !== "gif") {
    const img = sharp(input, { animated: meta.format === "webp" }).rotate();
    output = meta.format === "png" ? await img.png().toBuffer() : meta.format === "webp" ? await img.webp({ quality: 90 }).toBuffer() : await img.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  }

  const quota = imageQuota(me);
  const { used } = await usage(me.id);
  if (used + output.length > quota) return NextResponse.json({ success: false, error: "You're out of image storage. Delete some images or get Infected Plus." }, { status: 400 });

  let key = newImageKey();
  while (await prisma.hostedImage.findUnique({ where: { key }, select: { id: true } })) key = newImageKey();
  const ext = IMAGE_EXT[mime];
  const rel = `uploads/i/${key}.${ext}`;
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, `${key}.${ext}`), output);

  const width = meta.width ?? null;
  const height = meta.pageHeight ?? meta.height ?? null;
  const name = (file.name || `${key}.${ext}`).replace(/[^\w.\- ()]/g, "_").slice(0, 200);
  const created = await prisma.hostedImage.create({ data: { userId: me.id, key, path: rel, name, mime, size: output.length, width, height } });
  return NextResponse.json({ success: true, image: serialize(created) });
}

export async function DELETE(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = parseInt(String(body.id || ""), 10);
  const img = Number.isNaN(id) ? null : await prisma.hostedImage.findUnique({ where: { id } });
  if (!img || img.userId !== me.id) return NextResponse.json({ success: false, error: "Image not found." }, { status: 404 });
  await prisma.hostedImage.delete({ where: { id } });
  await unlink(path.join(process.cwd(), "public", img.path)).catch(() => {});
  return NextResponse.json({ success: true });
}
