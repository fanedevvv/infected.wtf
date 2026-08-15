import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { destroySession } from "@/lib/session";
import { getActiveProfileId } from "@/lib/active-profile";
import { parseStringArray, serializeStringArray } from "@/lib/json-array";

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
const ALLOWED_TEXT_EFFECTS = ["none", "glow", "rainbow", "shake", "glitch", "scramble", "shine", "typewriter", "flip"];
const ALLOWED_LAYOUTS = ["classic", "editorial", "terminal", "banner", "compact", "aurora", "cinematic", "dossier"];
const PREMIUM_LAYOUTS = ["aurora", "cinematic", "dossier"];

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
  const activeProfileId = await getActiveProfileId(userId);

  const form = await req.formData();
  const action = String(form.get("action") || "");

  if (action === "clear_avatar") {
    const row = await prisma.profile.findFirst({ where: { id: activeProfileId }, select: { avatar: true } });
    await deleteFile(row?.avatar);
    await prisma.profile.updateMany({ where: { id: activeProfileId }, data: { avatar: null } });
    return ok("Avatar removed!");
  }

  if (action === "clear_banner") {
    const row = await prisma.profile.findFirst({ where: { id: activeProfileId }, select: { banner: true } });
    await deleteFile(row?.banner);
    await prisma.profile.updateMany({ where: { id: activeProfileId }, data: { banner: null } });
    return ok("Banner removed!");
  }

  if (action === "delete_cursor") {
    const row = await prisma.profile.findFirst({ where: { id: activeProfileId }, select: { cursorPath: true } });
    await deleteFile(row?.cursorPath);
    await prisma.profile.updateMany({ where: { id: activeProfileId }, data: { cursorPath: null } });
    return ok("Cursor removed!");
  }

  if (action === "delete_music_track") {
    const row = await prisma.profile.findFirst({ where: { id: activeProfileId }, select: { musicTracks: true } });
    const existing = parseStringArray(row?.musicTracks);
    await deleteFile(existing[0]);
    await prisma.profile.updateMany({ where: { id: activeProfileId }, data: { musicTracks: serializeStringArray([]) } });
    return ok("Track removed!");
  }

  if (action === "set_playlist_style") {
    let playlistStyle = String(form.get("playlist_style") || "glow").trim();
    if (!["glow", "compact", "vinyl"].includes(playlistStyle)) playlistStyle = "glow";
    await prisma.profile.updateMany({ where: { id: activeProfileId }, data: { playlistStyle } });
    return ok("Playlist style saved!");
  }

  if (action === "set_layout_template") {
    let layoutTemplate = String(form.get("layout_template") || "classic").trim();
    if (!ALLOWED_LAYOUTS.includes(layoutTemplate)) layoutTemplate = "classic";
    const isPremium = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());
    if (PREMIUM_LAYOUTS.includes(layoutTemplate) && !isPremium) {
      return err("This layout is a Premium feature.");
    }
    await prisma.profile.updateMany({ where: { id: activeProfileId }, data: { layoutTemplate } });
    return ok("Layout saved!");
  }

  if (action === "clear_background") {
    const bg = await prisma.profile.findFirst({ where: { id: activeProfileId }, select: { backgroundType: true, backgroundValue: true } });
    if (bg && ["image", "video"].includes(bg.backgroundType) && bg.backgroundValue?.startsWith("uploads/backgrounds/")) {
      await deleteFile(bg.backgroundValue);
    }
    await prisma.profile.updateMany({ where: { id: activeProfileId }, data: { backgroundType: "particles", backgroundValue: "#050507" } });
    return ok("Background removed!");
  }

  if (action === "profile-info-form") {
    const dn = String(form.get("display_name") || "").trim().slice(0, 100);
    const bio = String(form.get("bio") || "").trim().slice(0, 300);
    const loc = String(form.get("location") || "").trim().slice(0, 100);
    const job = String(form.get("job") || "").trim().slice(0, 100);
    const birthDateRaw = String(form.get("birth_date") || "").trim();
    let birthDate: Date | null = null;
    if (birthDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(birthDateRaw)) {
      const parsed = new Date(birthDateRaw + "T00:00:00Z");
      if (!Number.isNaN(parsed.getTime()) && parsed <= new Date()) birthDate = parsed;
    }
    let font = String(form.get("profile_font") || "Syne").trim();
    if (!ALLOWED_FONTS.includes(font)) font = "Syne";
    let playlistStyle = String(form.get("playlist_style") || "glow").trim();
    if (!["glow", "compact", "vinyl"].includes(playlistStyle)) playlistStyle = "glow";
    let layoutTemplate = String(form.get("layout_template") || "classic").trim();
    if (!ALLOWED_LAYOUTS.includes(layoutTemplate)) layoutTemplate = "classic";
    const isPremium = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());
    if (PREMIUM_LAYOUTS.includes(layoutTemplate) && !isPremium) layoutTemplate = "classic";
    let avatar = String(form.get("avatar") || "").trim();
    if (avatar && !/^uploads\/avatars\/[a-zA-Z0-9_\-.]+$/.test(avatar)) avatar = "";
    const bgImg = String(form.get("background_image") || "").trim();
    const opacity = Math.max(0, Math.min(100, parseInt(String(form.get("profile_opacity") || "100"), 10) || 0));
    const blur = Math.max(0, Math.min(100, parseInt(String(form.get("profile_blur") || "0"), 10) || 0));

    const hexColor = (field: string, fallback: string) => {
      const v = String(form.get(field) || "").trim();
      return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
    };
    const accentColor = hexColor("accent_color", "#39ff14");
    const backgroundColor = hexColor("background_color", "#050507");
    const nameColor = hexColor("name_color", "#ffffff");
    const bioColor = hexColor("bio_color", "#c9c9d1");
    const overlayColor = hexColor("overlay_color", "#060610");

    await prisma.profile.updateMany({ where: { id: activeProfileId },
      data: {
        displayName: dn || null,
        bio: bio || null,
        location: loc || null,
        job: job || null,
        birthDate,
        profileFont: font,
        playlistStyle,
        layoutTemplate,
        avatar: avatar || null,
        profileOpacity: opacity,
        profileBlur: blur,
        accentColor,
        backgroundColor,
        nameColor,
        bioColor,
        overlayColor,
      },
    });

    if (bgImg && /^uploads\/backgrounds\/[a-zA-Z0-9_\-.]+$/.test(bgImg)) {
      await prisma.profile.updateMany({ where: { id: activeProfileId }, data: { backgroundType: "image", backgroundValue: bgImg } });
    }

    return ok("Profile saved!");
  }

  if (action === "effects-form") {
    const particle = form.get("particle_effect") !== null;
    const cursorTrail = form.get("cursor_trail") !== null;
    let ring = String(form.get("avatar_ring") || "none").trim();
    if (!["none", "normal", "premium"].includes(ring)) ring = "none";
    let nameEffect = String(form.get("name_effect") || "none").trim();
    if (!ALLOWED_TEXT_EFFECTS.includes(nameEffect)) nameEffect = "none";
    let bioEffect = String(form.get("bio_effect") || "none").trim();
    if (!ALLOWED_TEXT_EFFECTS.includes(bioEffect)) bioEffect = "none";

    await prisma.profile.updateMany({ where: { id: activeProfileId },
      data: { particleEffect: particle, cursorTrail, avatarRing: ring, nameEffect, bioEffect },
    });

    const row = await prisma.profile.findFirst({ where: { id: activeProfileId }, select: { activeEffects: true } });
    const active = { ...((row?.activeEffects as Record<string, string> | null) ?? {}) };
    let changed = false;
    if (particle && active.bg) { delete active.bg; changed = true; }
    if (cursorTrail && active.cursor) { delete active.cursor; changed = true; }
    if (ring !== "none" && active.avatar) { delete active.avatar; changed = true; }
    if (changed) await prisma.profile.updateMany({ where: { id: activeProfileId }, data: { activeEffects: active } });

    return ok("Effects saved!");
  }

  if (action === "save_avatar_shape") {
    const allowed = ["square", "soft", "rounded", "circle", "eye", "diamond", "egg"];
    let shape = String(form.get("avatar_shape") || "circle").trim();
    if (!allowed.includes(shape)) shape = "circle";
    await prisma.profile.updateMany({ where: { id: activeProfileId }, data: { avatarShape: shape } });
    return ok("Avatar shape saved!");
  }

  return err("Unknown action.");
}
