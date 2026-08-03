import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  if (!username) return NextResponse.json({ success: false, error: "Missing username." }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!target) return NextResponse.json({ success: false, error: "Profile not found." }, { status: 404 });
  if (target.id === me.id) return NextResponse.json({ success: false, error: "You can't like your own profile." }, { status: 400 });

  const existing = await prisma.profileLike.findUnique({
    where: { profileUserId_likerUserId: { profileUserId: target.id, likerUserId: me.id } },
  });

  let liked: boolean;
  if (existing) {
    await prisma.profileLike.delete({ where: { id: existing.id } });
    liked = false;
  } else {
    await prisma.profileLike.create({ data: { profileUserId: target.id, likerUserId: me.id } });
    liked = true;
  }

  const count = await prisma.profileLike.count({ where: { profileUserId: target.id } });
  return NextResponse.json({ success: true, liked, count });
}
