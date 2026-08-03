import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

function ok(data: Record<string, unknown>) {
  return NextResponse.json({ success: true, ...data });
}
function err(message: string) {
  return NextResponse.json({ success: false, error: message });
}

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

async function saveFile(subdir: string, filename: string, buffer: Buffer) {
  const dir = path.join(UPLOADS_ROOT, subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
}

async function deleteOld(relPath: string | null | undefined) {
  if (!relPath) return;
  const abs = path.join(process.cwd(), "public", relPath);
  if (existsSync(abs)) {
    try {
      await unlink(abs);
    } catch {}
  }
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return err("Unauthenticated.");
  }
  const userId = user.id;

  const form = await req.formData();
  const type = String(form.get("type") || "");

  if (type === "avatar") {
    const file = form.get("avatar");
    if (!(file instanceof File)) return err("Avatar upload error.");
    if (file.size > 5 * 1024 * 1024) return err("Max 5MB.");
    const exts: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp" };
    const ext = exts[file.type];
    if (!ext) return err("Unsupported type. We accept JPG, PNG, GIF, WebP.");

    const old = await prisma.profile.findUnique({ where: { userId }, select: { avatar: true } });
    await deleteOld(old?.avatar);

    const fname = `av_${userId}_${Date.now()}.${ext}`;
    await saveFile("avatars", fname, Buffer.from(await file.arrayBuffer()));
    const relPath = `uploads/avatars/${fname}`;
    await prisma.profile.update({ where: { userId }, data: { avatar: relPath } });
    return ok({ path: relPath, url: `/${relPath}` });
  }

  if (type === "background") {
    const file = form.get("background");
    if (!(file instanceof File)) return err("Background upload error.");
    if (file.size > 100 * 1024 * 1024) return err("Max 100MB.");
    const exts: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "video/mp4": "mp4" };
    const ext = exts[file.type];
    if (!ext) return err("Unsupported type.");

    const old = await prisma.profile.findUnique({ where: { userId }, select: { backgroundType: true, backgroundValue: true } });
    if (old && ["image", "video"].includes(old.backgroundType) && old.backgroundValue?.startsWith("uploads/backgrounds/")) {
      await deleteOld(old.backgroundValue);
    }

    const fname = `bg_${userId}_${Date.now()}.${ext}`;
    await saveFile("backgrounds", fname, Buffer.from(await file.arrayBuffer()));
    const relPath = `uploads/backgrounds/${fname}`;
    const bgType = file.type === "video/mp4" ? "video" : "image";
    await prisma.profile.update({ where: { userId }, data: { backgroundType: bgType, backgroundValue: relPath } });
    return ok({ path: relPath, url: `/${relPath}` });
  }

  if (type === "music") {
    const file = form.get("music");
    if (!(file instanceof File)) return err("Audio upload error.");
    if (file.size > 20 * 1024 * 1024) return err("Max 20MB for audio files.");
    const allowedExt = ["mp3", "ogg", "wav"];
    const origName = (file.name || "").toLowerCase();
    let ext = origName.split(".").pop() || "";
    const allowedMime = ["audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/wave", "audio/x-wav", "audio/vnd.wave", "application/octet-stream"];
    if (!allowedMime.includes(file.type) && !allowedExt.includes(ext)) return err(`Unsupported type. We accept MP3, OGG, WAV.`);
    if (!allowedExt.includes(ext)) ext = "mp3";

    const old = await prisma.profile.findUnique({ where: { userId }, select: { musicPath: true } });
    await deleteOld(old?.musicPath);

    const fname = `music_${userId}_${Date.now()}.${ext}`;
    await saveFile("music", fname, Buffer.from(await file.arrayBuffer()));
    const relPath = `uploads/music/${fname}`;
    await prisma.profile.update({ where: { userId }, data: { musicPath: relPath } });
    return ok({ path: relPath, url: `/${relPath}` });
  }

  if (type === "cursor") {
    const file = form.get("cursor");
    if (!(file instanceof File)) return err("Cursor upload error.");
    if (file.size > 2 * 1024 * 1024) return err("Max 2MB for cursor.");
    const mimeMap: Record<string, string> = { "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/jpeg": "jpg", "image/jpg": "jpg", "image/apng": "png" };
    const extMap: Record<string, string> = { png: "png", webp: "webp", gif: "gif", jpg: "jpg", jpeg: "jpg", cur: "cur" };
    const origExt = (file.name || "").toLowerCase().split(".").pop() || "";
    const ext = mimeMap[file.type] || extMap[origExt];
    if (!ext) return err("Unsupported type. We accept PNG, JPG, WebP, GIF, CUR.");

    const old = await prisma.profile.findUnique({ where: { userId }, select: { cursorPath: true } });
    await deleteOld(old?.cursorPath);

    const fname = `cursor_${userId}_${Date.now()}.${ext}`;
    await saveFile("cursors", fname, Buffer.from(await file.arrayBuffer()));
    const relPath = `uploads/cursors/${fname}`;
    await prisma.profile.update({ where: { userId }, data: { cursorPath: relPath } });
    return ok({ path: relPath, url: `/${relPath}` });
  }

  return err(`Unknown upload type: ${type}`);
}
