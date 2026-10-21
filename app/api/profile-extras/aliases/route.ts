import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getActiveProfileId } from "@/lib/active-profile";
import { isSlugTaken } from "@/lib/slug-availability";

const ALIAS_RE = /^[a-z0-9_.-]{3,30}$/;

function aliasLimit(user: { isPremium: boolean | null; premiumExpiresAt: Date | null }) {
  const premium = !!user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());
  return premium ? 10 : 3;
}

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  const profileId = await getActiveProfileId(me.id);
  const aliases = await prisma.profileAlias.findMany({ where: { profileId }, orderBy: { createdAt: "asc" }, select: { id: true, alias: true } });
  return NextResponse.json({ success: true, aliases, limit: aliasLimit(me) });
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  const profileId = await getActiveProfileId(me.id);
  const body = await req.json().catch(() => ({}));
  const alias = String(body.alias || "").trim().toLowerCase().replace(/^@/, "");

  if (!ALIAS_RE.test(alias)) return NextResponse.json({ success: false, error: "Aliases are 3-30 characters: letters, numbers, _ . -" }, { status: 400 });
  const count = await prisma.profileAlias.count({ where: { profileId } });
  if (count >= aliasLimit(me)) return NextResponse.json({ success: false, error: "You've reached your alias limit." }, { status: 400 });
  if (await isSlugTaken(alias)) return NextResponse.json({ success: false, error: "That name is already taken." }, { status: 400 });

  const created = await prisma.profileAlias.create({ data: { profileId, alias }, select: { id: true, alias: true } });
  return NextResponse.json({ success: true, alias: created });
}

export async function DELETE(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = parseInt(String(body.id || ""), 10);
  const row = Number.isNaN(id) ? null : await prisma.profileAlias.findUnique({ where: { id }, include: { profile: { select: { userId: true } } } });
  if (!row || row.profile.userId !== me.id) return NextResponse.json({ success: false, error: "Alias not found." }, { status: 404 });
  await prisma.profileAlias.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
