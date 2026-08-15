import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getActiveProfileId } from "@/lib/active-profile";

const SNAPSHOT_FIELDS = [
  "accentColor", "backgroundColor", "nameColor", "bioColor", "overlayColor",
  "backgroundType", "backgroundValue", "nameEffect", "bioEffect", "profileFont",
  "avatarShape", "avatarRing", "particleEffect", "cursorTrail", "layoutTemplate", "playlistStyle",
] as const;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const mineOnly = req.nextUrl.searchParams.get("mine") === "1";

  const themes = await prisma.theme.findMany({
    where: mineOnly && user ? { creatorId: user.id } : { active: true },
    orderBy: { purchaseCount: "desc" },
    include: { creator: { select: { username: true } } },
  });

  const owned = new Set<number>((user?.purchasedThemes as number[] | null) ?? []);

  return NextResponse.json({
    themes: themes.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      price: t.price,
      purchaseCount: t.purchaseCount,
      creatorUsername: t.creator.username,
      isOwner: user ? t.creatorId === user.id : false,
      owned: owned.has(t.id) || (user ? t.creatorId === user.id : false),
      preview: {
        accentColor: t.accentColor,
        backgroundColor: t.backgroundColor,
        nameColor: t.nameColor,
        bioColor: t.bioColor,
        overlayColor: t.overlayColor,
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

    const isShareableBg = ["particles", "color", "gradient"].includes(profile.backgroundType);

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
        backgroundType: isShareableBg ? profile.backgroundType : "particles",
        backgroundValue: isShareableBg ? profile.backgroundValue : "#050507",
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

    return NextResponse.json({ success: true, themeId: theme.id, downgradedBackground: !isShareableBg });
  }

  if (action === "buy") {
    const themeId = parseInt(String(body.themeId || ""), 10);
    const theme = await prisma.theme.findUnique({ where: { id: themeId } });
    if (!theme || !theme.active) return NextResponse.json({ success: false, error: "Theme not found." }, { status: 400 });
    if (theme.creatorId === user.id) return NextResponse.json({ success: false, error: "You already own your own theme." }, { status: 400 });

    const owned = new Set<number>((user.purchasedThemes as number[] | null) ?? []);
    if (owned.has(themeId)) return NextResponse.json({ success: false, error: "You already own this theme." }, { status: 400 });
    if (user.tokens < theme.price) return NextResponse.json({ success: false, error: "Not enough tokens." }, { status: 400 });

    owned.add(themeId);
    const creatorShare = Math.floor(theme.price / 2);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { tokens: { decrement: theme.price }, tokensSpent: { increment: theme.price }, purchasedThemes: Array.from(owned) },
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

    const owned = new Set<number>((user.purchasedThemes as number[] | null) ?? []);
    if (theme.creatorId !== user.id && !owned.has(themeId)) {
      return NextResponse.json({ success: false, error: "You don't own this theme." }, { status: 400 });
    }

    const activeProfileId = await getActiveProfileId(user.id);
    const data: Record<string, unknown> = {};
    for (const f of SNAPSHOT_FIELDS) data[f] = (theme as unknown as Record<string, unknown>)[f];
    await prisma.profile.update({ where: { id: activeProfileId }, data });

    return NextResponse.json({ success: true });
  }

  if (action === "unpublish") {
    const themeId = parseInt(String(body.themeId || ""), 10);
    const theme = await prisma.theme.findUnique({ where: { id: themeId } });
    if (!theme || theme.creatorId !== user.id) return NextResponse.json({ success: false, error: "Theme not found." }, { status: 400 });
    await prisma.theme.update({ where: { id: themeId }, data: { active: false } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: "Unknown action." }, { status: 400 });
}
