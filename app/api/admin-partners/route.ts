import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

const DIR = path.join(process.cwd(), "public", "uploads", "partners");
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function requireAdmin() {
  const me = await getCurrentUser();
  if (!me || me.banned || !(me.isAdmin || me.isOwner)) return null;
  return me;
}

const forbidden = () => NextResponse.json({ success: false, error: "Only admins can manage partners." }, { status: 403 });
const bad = (error: string) => NextResponse.json({ success: false, error }, { status: 400 });

function cleanUrl(raw: unknown): string | null {
  const v = String(raw || "").trim();
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString().slice(0, 300) : null;
  } catch {
    return null;
  }
}

/** Square 256px WebP — keeps the public page uniform and drops any metadata. */
async function saveImage(file: File, id: number): Promise<string> {
  const webp = await sharp(Buffer.from(await file.arrayBuffer()), { animated: false }).rotate().resize(256, 256, { fit: "cover" }).webp({ quality: 88 }).toBuffer();
  await mkdir(DIR, { recursive: true });
  const name = `partner_${id}_${Date.now()}.webp`;
  await writeFile(path.join(DIR, name), webp);
  return `uploads/partners/${name}`;
}

async function removeImage(rel: string | null) {
  if (rel) await unlink(path.join(process.cwd(), "public", rel)).catch(() => {});
}

export async function GET() {
  if (!(await requireAdmin())) return forbidden();
  const partners = await prisma.partner.findMany({ orderBy: [{ displayOrder: "asc" }, { id: "asc" }] });
  return NextResponse.json({ success: true, partners });
}

// Create (no id) or update (with id). Multipart so the image can come along.
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return forbidden();
  const form = await req.formData();
  const id = form.get("id") ? parseInt(String(form.get("id")), 10) : null;
  const name = String(form.get("name") || "").trim().slice(0, 80);
  const description = String(form.get("description") || "").trim().slice(0, 500) || null;
  const url = cleanUrl(form.get("url"));
  const file = form.get("image");
  const image = file instanceof File && file.size > 0 ? file : null;

  if (!name) return bad("Give the partner a name.");
  if (!url) return bad("The link must start with http:// or https://");
  if (image && (image.size > MAX_IMAGE_BYTES || !image.type.startsWith("image/"))) return bad("The picture must be an image up to 5 MB.");

  if (id) {
    const existing = await prisma.partner.findUnique({ where: { id } });
    if (!existing) return bad("Partner not found.");
    let imagePath = existing.image;
    if (image) {
      try { imagePath = await saveImage(image, id); } catch { return bad("That picture couldn't be read."); }
      await removeImage(existing.image);
    }
    const partner = await prisma.partner.update({ where: { id }, data: { name, description, url, image: imagePath } });
    return NextResponse.json({ success: true, partner });
  }

  const last = await prisma.partner.findFirst({ orderBy: { displayOrder: "desc" }, select: { displayOrder: true } });
  let partner = await prisma.partner.create({ data: { name, description, url, displayOrder: (last?.displayOrder ?? -1) + 1 } });
  if (image) {
    try {
      partner = await prisma.partner.update({ where: { id: partner.id }, data: { image: await saveImage(image, partner.id) } });
    } catch {
      await prisma.partner.delete({ where: { id: partner.id } });
      return bad("That picture couldn't be read.");
    }
  }
  return NextResponse.json({ success: true, partner });
}

// Small JSON actions: toggle visibility, move up/down.
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return forbidden();
  const body = await req.json().catch(() => ({}));
  const id = parseInt(String(body.id || ""), 10);
  const partner = Number.isNaN(id) ? null : await prisma.partner.findUnique({ where: { id } });
  if (!partner) return bad("Partner not found.");

  if (body.action === "toggle") {
    await prisma.partner.update({ where: { id }, data: { active: !partner.active } });
  } else if (body.action === "up" || body.action === "down") {
    const all = await prisma.partner.findMany({ orderBy: [{ displayOrder: "asc" }, { id: "asc" }], select: { id: true } });
    const i = all.findIndex((p) => p.id === id);
    const j = body.action === "up" ? i - 1 : i + 1;
    if (j >= 0 && j < all.length) {
      [all[i], all[j]] = [all[j], all[i]];
      // Renumber everything so legacy duplicate orders can't make a move a no-op.
      await prisma.$transaction(all.map((p, k) => prisma.partner.update({ where: { id: p.id }, data: { displayOrder: k } })));
    }
  } else {
    return bad("Unknown action.");
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return forbidden();
  const body = await req.json().catch(() => ({}));
  const id = parseInt(String(body.id || ""), 10);
  const partner = Number.isNaN(id) ? null : await prisma.partner.findUnique({ where: { id } });
  if (!partner) return bad("Partner not found.");
  await prisma.partner.delete({ where: { id } });
  await removeImage(partner.image);
  return NextResponse.json({ success: true });
}
