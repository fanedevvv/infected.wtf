import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, validateUsername } from "@/lib/auth-helpers";
import { getActiveProfileId, setActiveProfileCookie, maxPagesFor } from "@/lib/active-profile";

const RESERVED_SLUGS = new Set([
  "login", "register", "logout", "dashboard", "leaderboard", "admin", "api", "support",
  "terms", "privacy", "banned", "maintenance", "forgot-password", "reset-password", "auth",
  "assets", "uploads", "favicon.ico",
]);

function isPremiumNow(isPremium: boolean, premiumExpiresAt: Date | null): boolean {
  return isPremium && (!premiumExpiresAt || premiumExpiresAt.getTime() > Date.now());
}

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  }

  const [pages, activeId] = await Promise.all([
    prisma.profile.findMany({
      where: { userId: user.id },
      orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
      select: { id: true, slug: true, displayName: true, avatar: true, isPrimary: true, views: true },
    }),
    getActiveProfileId(user.id),
  ]);

  const premium = isPremiumNow(user.isPremium, user.premiumExpiresAt);
  return NextResponse.json({ success: true, pages, activeProfileId: activeId, maxPages: maxPagesFor(premium) });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug || "").trim().toLowerCase();

  if (!validateUsername(slug)) {
    return NextResponse.json({ success: false, error: "Slug must be 3-30 characters: letters, digits, _ - ." }, { status: 400 });
  }
  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ success: false, error: "That slug is reserved." }, { status: 400 });
  }

  const premium = isPremiumNow(user.isPremium, user.premiumExpiresAt);
  const limit = maxPagesFor(premium);
  const count = await prisma.profile.count({ where: { userId: user.id } });
  if (count >= limit) {
    return NextResponse.json(
      { success: false, error: premium ? `You can have at most ${limit} pages.` : "Upgrade to Premium to create additional pages." },
      { status: 400 }
    );
  }

  const taken = await prisma.profile.findUnique({ where: { slug }, select: { id: true } });
  if (taken) {
    return NextResponse.json({ success: false, error: "That slug is already taken." }, { status: 400 });
  }

  const page = await prisma.profile.create({
    data: { userId: user.id, slug, displayName: slug, isPrimary: false },
  });

  await setActiveProfileCookie(page.id);

  return NextResponse.json({ success: true, page: { id: page.id, slug: page.slug } });
}

export async function PATCH(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const profileId = parseInt(String(body.profileId || ""), 10);
  if (!Number.isFinite(profileId)) {
    return NextResponse.json({ success: false, error: "Missing profileId." }, { status: 400 });
  }

  const page = await prisma.profile.findFirst({ where: { id: profileId, userId: user.id } });
  if (!page) return NextResponse.json({ success: false, error: "Page not found." }, { status: 404 });

  if (body.action === "set_primary") {
    await prisma.$transaction([
      prisma.profile.updateMany({ where: { userId: user.id, isPrimary: true }, data: { isPrimary: false } }),
      prisma.profile.update({ where: { id: page.id }, data: { isPrimary: true } }),
    ]);
    return NextResponse.json({ success: true });
  }

  await setActiveProfileCookie(page.id);
  return NextResponse.json({ success: true, activeProfileId: page.id });
}

export async function DELETE(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const profileId = parseInt(String(body.profileId || ""), 10);
  if (!Number.isFinite(profileId)) {
    return NextResponse.json({ success: false, error: "Missing profileId." }, { status: 400 });
  }

  const page = await prisma.profile.findFirst({ where: { id: profileId, userId: user.id } });
  if (!page) return NextResponse.json({ success: false, error: "Page not found." }, { status: 404 });
  if (page.isPrimary) return NextResponse.json({ success: false, error: "You can't delete your primary page." }, { status: 400 });

  await prisma.profile.delete({ where: { id: page.id } });

  const primary = await prisma.profile.findFirst({ where: { userId: user.id, isPrimary: true }, select: { id: true } });
  if (primary) await setActiveProfileCookie(primary.id);

  return NextResponse.json({ success: true });
}
