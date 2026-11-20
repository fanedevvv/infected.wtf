import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { activeBoosts, canAnimate, canUseStrip } from "@/lib/crews";

// Group media: icon (square), banner (3:1) and profile strip (350×19, rage.wtf-style). Re-encoded to WebP at fixed
// sizes; animated (GIF/WebP) input stays animated only from group level 2.
const SIZES = { icon: [256, 256], banner: [1500, 500], strip: [700, 38] } as const;
type Kind = keyof typeof SIZES;
const DIR = path.join(process.cwd(), "public", "uploads", "groups");
const MAX_BYTES = 8 * 1024 * 1024;
const err = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

async function managedCrew(userId: number) {
  const m = await prisma.crewMember.findUnique({ where: { userId }, include: { crew: true } });
  return m && (m.role === "owner" || m.role === "officer") ? m.crew : null;
}
async function removeFile(rel: string | null) {
  if (rel && rel.startsWith("uploads/groups/")) await unlink(path.join(process.cwd(), "public", rel)).catch(() => {});
}

export async function POST(req: NextRequest) {
  let me;
  try { me = await requireUser(); } catch { return err("Unauthorized", 401); }
  const crew = await managedCrew(me.id);
  if (!crew) return err("Only the owner and officers can change the group's images.", 403);
  const form = await req.formData();
  const kind = String(form.get("kind")) as Kind;
  if (!(kind in SIZES)) return err("Unknown image type.");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return err("No image uploaded.");
  if (file.size > MAX_BYTES || !file.type.startsWith("image/")) return err("The image must be under 8 MB.");

  const boosts = (await activeBoosts([crew.id])).get(crew.id) ?? 0;
  if (kind === "strip" && !canUseStrip(boosts)) return err("The profile strip unlocks at group level 1 (2 boosts).", 403);
  const animate = canAnimate(boosts);

  let out: Buffer;
  try {
    const [w, h] = SIZES[kind];
    out = await sharp(Buffer.from(await file.arrayBuffer()), { animated: animate, failOn: "none" })
      .resize(w, h, { fit: "cover", position: "centre" })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
  } catch {
    return err("That image couldn't be read.");
  }
  await mkdir(DIR, { recursive: true });
  const rel = `uploads/groups/g${crew.id}_${kind}_${Date.now()}.webp`;
  await writeFile(path.join(process.cwd(), "public", rel), out);
  await prisma.crew.update({ where: { id: crew.id }, data: { [kind]: rel } });
  await removeFile(crew[kind]);
  return NextResponse.json({ success: true, path: rel, message: "Image updated." });
}

export async function DELETE(req: NextRequest) {
  let me;
  try { me = await requireUser(); } catch { return err("Unauthorized", 401); }
  const crew = await managedCrew(me.id);
  if (!crew) return err("Forbidden", 403);
  const kind = String(req.nextUrl.searchParams.get("kind")) as Kind;
  if (!(kind in SIZES)) return err("Unknown image type.");
  await prisma.crew.update({ where: { id: crew.id }, data: { [kind]: null } });
  await removeFile(crew[kind]);
  return NextResponse.json({ success: true, message: "Image removed." });
}
