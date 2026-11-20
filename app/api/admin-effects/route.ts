import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { RARITIES } from "@/lib/custom-effects";

// Staff-uploaded profile effects. The file is stored as-is (re-encoding would drop the animation / transparency),
// so it's only accepted after checking its magic bytes.

const DIR = path.join(process.cwd(), "public", "uploads", "effects");
const MAX_BYTES = 15 * 1024 * 1024;

async function requireAdmin() {
  const me = await getCurrentUser();
  if (!me || me.banned || !(me.isAdmin || me.isOwner)) return null;
  return me;
}
const forbidden = () => NextResponse.json({ success: false, error: "Only admins can manage profile effects." }, { status: 403 });
const bad = (error: string) => NextResponse.json({ success: false, error }, { status: 400 });

/** What the file really is, from its first bytes — never from the name or the browser's MIME type. */
function sniff(buf: Buffer): { ext: string; kind: "image" | "video" } | null {
  if (buf.length < 12) return null;
  if (buf.subarray(0, 4).toString("ascii") === "GIF8") return { ext: "gif", kind: "image" };
  if (buf[0] === 0x89 && buf.subarray(1, 4).toString("ascii") === "PNG") return { ext: "png", kind: "image" };
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return { ext: "webp", kind: "image" };
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return { ext: "webm", kind: "video" };
  return null;
}

async function removeFile(rel: string | null | undefined) {
  if (rel && rel.startsWith("uploads/effects/")) await unlink(path.join(process.cwd(), "public", rel)).catch(() => {});
}

export async function GET() {
  if (!(await requireAdmin())) return forbidden();
  const effects = await prisma.customEffect.findMany({ orderBy: { id: "desc" } });
  return NextResponse.json({ success: true, effects });
}

// Create (no id, file required) or update (with id, file optional).
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return forbidden();
  const form = await req.formData();
  const id = form.get("id") ? parseInt(String(form.get("id")), 10) : null;
  const name = String(form.get("name") || "").trim().slice(0, 60);
  const description = String(form.get("description") || "").trim().slice(0, 200) || null;
  const rarity = String(form.get("rarity") || "epic");
  const price = parseInt(String(form.get("price") || ""), 10);
  const upload = form.get("file");
  const file = upload instanceof File && upload.size > 0 ? upload : null;

  if (!name) return bad("Give the effect a name.");
  if (!(RARITIES as string[]).includes(rarity)) return bad("Pick a rarity.");
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000) return bad("The price must be a number of tokens.");
  if (!id && !file) return bad("Choose the effect file.");
  if (file && file.size > MAX_BYTES) return bad("The file can be at most 15 MB.");

  let stored: { file: string; kind: string } | null = null;
  if (file) {
    const buf = Buffer.from(await file.arrayBuffer());
    const type = sniff(buf);
    if (!type) return bad("Use an animated WebP, GIF, APNG (.png) or a WebM video.");
    await mkdir(DIR, { recursive: true });
    const fname = `effect_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${type.ext}`;
    await writeFile(path.join(DIR, fname), buf);
    stored = { file: `uploads/effects/${fname}`, kind: type.kind };
  }

  if (id) {
    const existing = await prisma.customEffect.findUnique({ where: { id } });
    if (!existing) { await removeFile(stored?.file); return bad("Effect not found."); }
    const effect = await prisma.customEffect.update({ where: { id }, data: { name, description, rarity, price, ...(stored ?? {}) } });
    if (stored) await removeFile(existing.file);
    return NextResponse.json({ success: true, effect });
  }
  const effect = await prisma.customEffect.create({ data: { name, description, rarity, price, file: stored!.file, kind: stored!.kind } });
  return NextResponse.json({ success: true, effect });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return forbidden();
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  const existing = Number.isInteger(id) ? await prisma.customEffect.findUnique({ where: { id } }) : null;
  if (!existing) return bad("Effect not found.");
  if (body.action !== "toggle") return bad("Unknown action.");
  const effect = await prisma.customEffect.update({ where: { id }, data: { enabled: !existing.enabled } });
  return NextResponse.json({ success: true, effect });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return forbidden();
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  const existing = Number.isInteger(id) ? await prisma.customEffect.findUnique({ where: { id } }) : null;
  if (!existing) return bad("Effect not found.");
  await prisma.customEffect.delete({ where: { id } });
  await removeFile(existing.file);
  return NextResponse.json({ success: true });
}
