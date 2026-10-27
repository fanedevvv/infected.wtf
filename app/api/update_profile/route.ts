import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { destroySession } from "@/lib/session";
import { getActiveProfileId } from "@/lib/active-profile";
import { parseStringArray, serializeStringArray, parseJsonObject } from "@/lib/json-array";
import { isKnownFont, isPremiumFont, DEFAULT_PROFILE_FONT } from "@/lib/profile-fonts";
import { DEFAULT_LAYOUT, isPremiumLayout, resolveLayout } from "@/lib/profile-layouts";
import { resolveShape } from "@/lib/avatar-shapes";

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

const ALLOWED_TEXT_EFFECTS = ["none", "glow", "rainbow", "shake", "glitch", "scramble", "shine", "typewriter", "flip"];

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
    await prisma.profile.updateMany({
      where: { id: activeProfileId },
      data: {
        musicTracks: serializeStringArray([]),
        musicTrackTitle: null,
        musicTrackArtist: null,
        musicArtworkUrl: null,
        musicLyricsSynced: null,
        musicLyricsPlain: null,
        musicShowLyrics: false,
        musicLyricsOffsetMs: 0,
        musicLyricsStyle: "line",
      },
    });
    return ok("Track removed!");
  }

  if (action === "set_music_metadata") {
    const trackTitle = String(form.get("track_title") || "").trim().slice(0, 150) || null;
    const trackArtist = String(form.get("track_artist") || "").trim().slice(0, 150) || null;
    const artworkUrl = String(form.get("artwork_url") || "").trim().slice(0, 500) || null;
    const lyricsSynced = String(form.get("lyrics_synced") || "").trim() || null;
    const lyricsPlain = String(form.get("lyrics_plain") || "").trim() || null;
    const showLyrics = form.get("show_lyrics") === "1";
    const offsetMs = Math.max(-15000, Math.min(15000, parseInt(String(form.get("lyrics_offset_ms") || "0"), 10) || 0));
    let lyricsStyle = String(form.get("lyrics_style") || "line").trim();
    if (!["line", "karaoke", "block"].includes(lyricsStyle)) lyricsStyle = "line";
    if (artworkUrl && !/^https:\/\//i.test(artworkUrl)) return err("Invalid artwork URL.");
    await prisma.profile.updateMany({
      where: { id: activeProfileId },
      data: { musicTrackTitle: trackTitle, musicTrackArtist: trackArtist, musicArtworkUrl: artworkUrl, musicLyricsSynced: lyricsSynced, musicLyricsPlain: lyricsPlain, musicShowLyrics: showLyrics, musicLyricsOffsetMs: offsetMs, musicLyricsStyle: lyricsStyle },
    });
    return ok("Saved!");
  }

  if (action === "set_widget_toggles") {
    const showWeather = form.get("show_weather") === "1";
    const showClock = form.get("show_clock") === "1";
    const clock24h = form.get("clock_24h") === "1";
    await prisma.profile.updateMany({ where: { id: activeProfileId }, data: { showWeather, showClock, clock24h } });
    return ok("Saved!");
  }

  if (action === "set_playlist_style") {
    let playlistStyle = String(form.get("playlist_style") || "glow").trim();
    if (!["glow", "compact", "vinyl"].includes(playlistStyle)) playlistStyle = "glow";
    await prisma.profile.updateMany({ where: { id: activeProfileId }, data: { playlistStyle } });
    return ok("Playlist style saved!");
  }

  if (action === "set_layout_template") {
    const requested = String(form.get("layout_template") || DEFAULT_LAYOUT).trim();
    const isPremium = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());
    if (isPremiumLayout(requested) && !isPremium) {
      return err("This layout is an Infected Plus feature.");
    }
    const layoutTemplate = resolveLayout(requested, isPremium);
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
    const isPremium = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());
    let font = String(form.get("profile_font") || DEFAULT_PROFILE_FONT).trim();
    if (!isKnownFont(font)) font = DEFAULT_PROFILE_FONT;
    if (isPremiumFont(font) && !isPremium) font = DEFAULT_PROFILE_FONT;
    let playlistStyle = String(form.get("playlist_style") || "glow").trim();
    if (!["glow", "compact", "vinyl"].includes(playlistStyle)) playlistStyle = "glow";
    const layoutTemplate = resolveLayout(String(form.get("layout_template") || DEFAULT_LAYOUT).trim(), isPremium);
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
    let nameEffect = String(form.get("name_effect") || "none").trim();
    if (!ALLOWED_TEXT_EFFECTS.includes(nameEffect)) nameEffect = "none";
    let bioEffect = String(form.get("bio_effect") || "none").trim();
    if (!ALLOWED_TEXT_EFFECTS.includes(bioEffect)) bioEffect = "none";

    await prisma.profile.updateMany({ where: { id: activeProfileId },
      data: { particleEffect: particle, cursorTrail, nameEffect, bioEffect },
    });

    const row = await prisma.profile.findFirst({ where: { id: activeProfileId }, select: { activeEffects: true } });
    const active = { ...((parseJsonObject<Record<string, string>>(row?.activeEffects) ?? {})) };
    let changed = false;
    if (particle && active.bg) { delete active.bg; changed = true; }
    if (cursorTrail && active.cursor) { delete active.cursor; changed = true; }
    if (changed) await prisma.profile.updateMany({ where: { id: activeProfileId }, data: { activeEffects: active } });

    return ok("Effects saved!");
  }

  if (action === "save_avatar_shape") {
    const shape = resolveShape(String(form.get("avatar_shape") || "").trim());
    await prisma.profile.updateMany({ where: { id: activeProfileId }, data: { avatarShape: shape } });
    return ok("Avatar shape saved!");
  }

  return err("Unknown action.");
}
