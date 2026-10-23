import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getActiveProfileId } from "@/lib/active-profile";
import { parseNumberArray, serializeNumberArray } from "@/lib/json-array";
import { pickThemeSnapshot } from "@/lib/theme-snapshot";
import { copyFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import crypto from "crypto";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

/** Themes need their own copy of an image/video background — it must survive
 *  the creator later replacing or deleting their live profile background
 *  (which deletes that file). Returns the new relative path, or null if the
 *  source file is missing (caller falls back to downgrading to particles). */
async function copyBackgroundForTheme(relPath: string): Promise<string | null> {
  const src = path.join(process.cwd(), "public", relPath);
  if (!existsSync(src)) return null;
  const ext = path.extname(relPath) || "";
  const fname = `theme_${Date.now()}_${crypto.randomBytes(6).toString("hex")}${ext}`;
  const dir = path.join(UPLOADS_ROOT, "theme-backgrounds");
  await mkdir(dir, { recursive: true });
  await copyFile(src, path.join(dir, fname));
  return `uploads/theme-backgrounds/${fname}`;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const mineOnly = req.nextUrl.searchParams.get("mine") === "1";

  const themes = await prisma.theme.findMany({
    where: mineOnly && user ? { creatorId: user.id } : { active: true },
    orderBy: { purchaseCount: "desc" },
    include: { creator: { select: { username: true, profiles: { where: { isPrimary: true }, select: { avatar: true }, take: 1 } } } },
  });

  const owned = new Set<number>(parseNumberArray(user?.purchasedThemes));

  return NextResponse.json({
    themes: themes.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      price: t.price,
      purchaseCount: t.purchaseCount,
      creatorUsername: t.creator.username,
      creatorAvatar: t.creator.profiles[0]?.avatar ?? null,
      isOwner: user ? t.creatorId === user.id : false,
      owned: owned.has(t.id) || (user ? t.creatorId === user.id : false),
      active: t.active,
      preview: {
        accentColor: t.accentColor,
        backgroundColor: t.backgroundColor,
        nameColor: t.nameColor,
        bioColor: t.bioColor,
        overlayColor: t.overlayColor,
        backgroundType: t.backgroundType,
        backgroundValue: t.backgroundValue,
        nameEffect: t.nameEffect,
        bioEffect: t.bioEffect,
        avatarShape: t.avatarShape,
        particleEffect: t.particleEffect,
        cursorTrail: t.cursorTrail,
        layoutTemplate: t.layoutTemplate,
      },
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  if (action === "publish") {
    const name = String(body.name || "").trim().slice(0, 60);
    const description = String(body.description || "").trim().slice(0, 300);
    const price = Math.max(50, Math.min(2000, parseInt(String(body.price || 100), 10) || 100));
    if (!name) return NextResponse.json({ success: false, error: "Give your theme a name." }, { status: 400 });

    const activeProfileId = await getActiveProfileId(user.id);
    const profile = await prisma.profile.findUnique({ where: { id: activeProfileId } });
    if (!profile) return NextResponse.json({ success: false, error: "Profile not found." }, { status: 400 });

    // Particles/color/gradient are just values, shared as-is. An uploaded
    // image/video background gets its own copy under uploads/theme-backgrounds/
    // so it keeps working for every buyer even if the creator later changes
    // or deletes their own live background (which deletes that file).
    let themeBackgroundType = profile.backgroundType;
    let themeBackgroundValue = profile.backgroundValue;
    let downgradedBackground = false;
    if (["image", "video"].includes(profile.backgroundType)) {
      const copied = profile.backgroundValue ? await copyBackgroundForTheme(profile.backgroundValue) : null;
      if (copied) {
        themeBackgroundValue = copied;
      } else {
        themeBackgroundType = "particles";
        themeBackgroundValue = "#050507";
        downgradedBackground = true;
      }
    }

    const theme = await prisma.theme.create({
      data: {
        creatorId: user.id,
        name,
        description: description || null,
        price,
        accentColor: profile.accentColor,
        backgroundColor: profile.backgroundColor,
        nameColor: profile.nameColor,
        bioColor: profile.bioColor,
        overlayColor: profile.overlayColor,
        backgroundType: themeBackgroundType,
        backgroundValue: themeBackgroundValue,
        nameEffect: profile.nameEffect,
        bioEffect: profile.bioEffect,
        profileFont: profile.profileFont,
        avatarShape: profile.avatarShape,
        avatarRing: profile.avatarRing === "premium" ? "normal" : profile.avatarRing,
        particleEffect: profile.particleEffect,
        cursorTrail: profile.cursorTrail,
        layoutTemplate: profile.layoutTemplate,
        playlistStyle: profile.playlistStyle,
      },
    });

    return NextResponse.json({ success: true, themeId: theme.id, downgradedBackground });
  }

  if (action === "buy") {
    const themeId = parseInt(String(body.themeId || ""), 10);
    const theme = await prisma.theme.findUnique({ where: { id: themeId } });
    if (!theme || !theme.active) return NextResponse.json({ success: false, error: "Theme not found." }, { status: 400 });
    if (theme.creatorId === user.id) return NextResponse.json({ success: false, error: "You already own your own theme." }, { status: 400 });

    const owned = new Set<number>(parseNumberArray(user.purchasedThemes));
    if (owned.has(themeId)) return NextResponse.json({ success: false, error: "You already own this theme." }, { status: 400 });
    if (user.tokens < theme.price) return NextResponse.json({ success: false, error: "Not enough tokens." }, { status: 400 });

    owned.add(themeId);
    const creatorShare = Math.floor(theme.price / 2);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { tokens: { decrement: theme.price }, tokensSpent: { increment: theme.price }, purchasedThemes: serializeNumberArray(Array.from(owned)) },
      }),
      prisma.user.update({ where: { id: theme.creatorId }, data: { tokens: { increment: creatorShare } } }),
      prisma.theme.update({ where: { id: theme.id }, data: { purchaseCount: { increment: 1 } } }),
      prisma.notification.create({
        data: {
          userId: theme.creatorId,
          type: "gift",
          title: "Your theme sold! 💰",
          body: `@${user.username} bought "${theme.name}" — you earned ${creatorShare} tokens.`,
          icon: "gift",
          link: "/dashboard?page=marketplace",
        },
      }),
    ]);

    return NextResponse.json({ success: true, tokens: user.tokens - theme.price });
  }

  if (action === "apply") {
    const themeId = parseInt(String(body.themeId || ""), 10);
    const theme = await prisma.theme.findUnique({ where: { id: themeId } });
    if (!theme) return NextResponse.json({ success: false, error: "Theme not found." }, { status: 400 });

    const owned = new Set<number>(parseNumberArray(user.purchasedThemes));
    if (theme.creatorId !== user.id && !owned.has(themeId)) {
      return NextResponse.json({ success: false, error: "You don't own this theme." }, { status: 400 });
    }

    const activeProfileId = await getActiveProfileId(user.id);
    await prisma.profile.update({ where: { id: activeProfileId }, data: pickThemeSnapshot(theme) });

    return NextResponse.json({ success: true });
  }

  if (action === "unpublish" || action === "republish") {
    const themeId = parseInt(String(body.themeId || ""), 10);
    const theme = await prisma.theme.findUnique({ where: { id: themeId } });
    if (!theme || theme.creatorId !== user.id) return NextResponse.json({ success: false, error: "Theme not found." }, { status: 400 });
    await prisma.theme.update({ where: { id: themeId }, data: { active: action === "republish" } });
    return NextResponse.json({ success: true, active: action === "republish" });
  }

  return NextResponse.json({ success: false, error: "Unknown action." }, { status: 400 });
}
