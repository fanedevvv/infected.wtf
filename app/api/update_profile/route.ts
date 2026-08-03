import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { destroySession } from "@/lib/session";

function ok(message = "OK") {
  return NextResponse.json({ success: true, message });
}
function err(message: string) {
  return NextResponse.json({ success: false, error: message });
}

async function deleteFile(relPath: string | null | undefined) {
  if (!relPath) return;
  const abs = path.join(process.cwd(), "public", relPath);
  if (existsSync(abs)) {
    try {
      await unlink(abs);
    } catch {}
  }
}

const ALLOWED_FONTS = ["Syne", "Outfit", "Space Mono", "Rajdhani", "Orbitron", "Bebas Neue", "Exo 2", "Josefin Sans"];

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return err("Unauthenticated.");
  }
  if (user.banned) {
    await destroySession();
    return err("Your account has been suspended.");
  }
  const userId = user.id;

  const form = await req.formData();
  const action = String(form.get("action") || "");

  if (action === "clear_avatar") {
    const row = await prisma.profile.findUnique({ where: { userId }, select: { avatar: true } });
    await deleteFile(row?.avatar);
    await prisma.profile.update({ where: { userId }, data: { avatar: null } });
    return ok("Avatar removed!");
  }

  if (action === "clear_background") {
    const bg = await prisma.profile.findUnique({ where: { userId }, select: { backgroundType: true, backgroundValue: true } });
    if (bg && ["image", "video"].includes(bg.backgroundType) && bg.backgroundValue?.startsWith("uploads/backgrounds/")) {
      await deleteFile(bg.backgroundValue);
    }
    await prisma.profile.update({ where: { userId }, data: { backgroundType: "particles", backgroundValue: "#050507" } });
    return ok("Background removed!");
  }

  if (action === "profile-info-form") {
    const dn = String(form.get("display_name") || "").trim().slice(0, 100);
    const bio = String(form.get("bio") || "").trim().slice(0, 300);
    const loc = String(form.get("location") || "").trim().slice(0, 100);
    let font = String(form.get("profile_font") || "Syne").trim();
    if (!ALLOWED_FONTS.includes(font)) font = "Syne";
    let avatar = String(form.get("avatar") || "").trim();
    if (avatar && !/^uploads\/avatars\/[a-zA-Z0-9_\-.]+$/.test(avatar)) avatar = "";
    const bgImg = String(form.get("background_image") || "").trim();
    const opacity = Math.max(0, Math.min(100, parseInt(String(form.get("profile_opacity") || "100"), 10) || 0));
    const blur = Math.max(0, Math.min(100, parseInt(String(form.get("profile_blur") || "0"), 10) || 0));

    await prisma.profile.update({
      where: { userId },
      data: {
        displayName: dn || null,
        bio: bio || null,
        location: loc || null,
        profileFont: font,
        avatar: avatar || null,
        profileOpacity: opacity,
        profileBlur: blur,
        typingEffect: false,
      },
    });

    if (bgImg && /^uploads\/backgrounds\/[a-zA-Z0-9_\-.]+$/.test(bgImg)) {
      await prisma.profile.update({ where: { userId }, data: { backgroundType: "image", backgroundValue: bgImg } });
    }

    return ok("Profile saved!");
  }

  if (action === "effects-form") {
    const particle = form.get("particle_effect") !== null;
    const cursorTrail = form.get("cursor_trail") !== null;
    const typing = form.get("typing_effect") !== null;
    let ring = String(form.get("avatar_ring") || "none").trim();
    if (!["none", "normal", "premium"].includes(ring)) ring = "none";

    await prisma.profile.update({
      where: { userId },
      data: { particleEffect: particle, cursorTrail, typingEffect: typing, avatarRing: ring },
    });

    const row = await prisma.profile.findUnique({ where: { userId }, select: { activeEffects: true } });
    const active = { ...((row?.activeEffects as Record<string, string> | null) ?? {}) };
    let changed = false;
    if (particle && active.bg) { delete active.bg; changed = true; }
    if (cursorTrail && active.cursor) { delete active.cursor; changed = true; }
    if (ring !== "none" && active.avatar) { delete active.avatar; changed = true; }
    if (changed) await prisma.profile.update({ where: { userId }, data: { activeEffects: active } });

    return ok("Effects saved!");
  }

  if (action === "save_avatar_shape") {
    const allowed = ["square", "soft", "rounded", "circle", "eye", "diamond", "egg"];
    let shape = String(form.get("avatar_shape") || "circle").trim();
    if (!allowed.includes(shape)) shape = "circle";
    await prisma.profile.update({ where: { userId }, data: { avatarShape: shape } });
    return ok("Avatar shape saved!");
  }

  return err("Unknown action.");
}
