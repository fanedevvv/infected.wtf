import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getActiveProfileId } from "@/lib/active-profile";

const friendSelect = { slug: true, displayName: true, avatar: true, user: { select: { username: true } } } as const;

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  const profileId = await getActiveProfileId(me.id);
  const row = await prisma.profileBestFriend.findUnique({ where: { profileId }, select: { friend: { select: friendSelect } } });
  return NextResponse.json({
    success: true,
    friend: row ? { slug: row.friend.slug, displayName: row.friend.displayName || row.friend.user.username, avatar: row.friend.avatar } : null,
  });
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  const profileId = await getActiveProfileId(me.id);
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug || "").trim().replace(/^@/, "").replace(/^https?:\/\/[^/]+\//, "");

  const friend = await prisma.profile.findUnique({ where: { slug }, select: { id: true, userId: true, ...friendSelect, user: { select: { username: true, banned: true } } } });
  if (!friend || friend.user.banned) return NextResponse.json({ success: false, error: "No profile with that name." }, { status: 404 });
  if (friend.userId === me.id) return NextResponse.json({ success: false, error: "Pick someone else's profile." }, { status: 400 });

  await prisma.profileBestFriend.upsert({
    where: { profileId },
    create: { profileId, friendProfileId: friend.id },
    update: { friendProfileId: friend.id },
  });
  await prisma.notification.create({
    data: { userId: friend.userId, type: "best_friend", title: "You're someone's best friend 💖", body: `@${me.username} added you as their best friend.`, icon: "bell", link: `/${me.username}` },
  }).catch(() => {});

  return NextResponse.json({ success: true, friend: { slug: friend.slug, displayName: friend.displayName || friend.user.username, avatar: friend.avatar } });
}

export async function DELETE() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  const profileId = await getActiveProfileId(me.id);
  await prisma.profileBestFriend.deleteMany({ where: { profileId } });
  return NextResponse.json({ success: true });
}
