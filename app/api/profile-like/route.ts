import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// Toggles a like or dislike on a profile. The two are mutually exclusive: casting one removes the other.
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const slug = String(body.username || "").trim();
  const action = body.action === "dislike" ? "dislike" : "like";
  if (!slug) return NextResponse.json({ success: false, error: "Missing slug." }, { status: 400 });

  const targetProfile = await prisma.profile.findUnique({ where: { slug }, select: { userId: true } });
  if (!targetProfile) return NextResponse.json({ success: false, error: "Profile not found." }, { status: 404 });
  const targetId = targetProfile.userId;
  if (targetId === me.id) return NextResponse.json({ success: false, error: "You can't rate your own profile." }, { status: 400 });

  const [existingLike, existingDislike] = await Promise.all([
    prisma.profileLike.findUnique({ where: { profileUserId_likerUserId: { profileUserId: targetId, likerUserId: me.id } } }),
    prisma.profileDislike.findUnique({ where: { profileUserId_dislikerUserId: { profileUserId: targetId, dislikerUserId: me.id } } }),
  ]);

  if (action === "like") {
    if (existingLike) {
      await prisma.profileLike.delete({ where: { id: existingLike.id } });
    } else {
      await prisma.$transaction([
        ...(existingDislike ? [prisma.profileDislike.delete({ where: { id: existingDislike.id } })] : []),
        prisma.profileLike.create({ data: { profileUserId: targetId, likerUserId: me.id } }),
      ]);
    }
  } else if (existingDislike) {
    await prisma.profileDislike.delete({ where: { id: existingDislike.id } });
  } else {
    await prisma.$transaction([
      ...(existingLike ? [prisma.profileLike.delete({ where: { id: existingLike.id } })] : []),
      prisma.profileDislike.create({ data: { profileUserId: targetId, dislikerUserId: me.id } }),
    ]);
  }

  const [count, dislikeCount] = await Promise.all([
    prisma.profileLike.count({ where: { profileUserId: targetId } }),
    prisma.profileDislike.count({ where: { profileUserId: targetId } }),
  ]);
  const liked = action === "like" ? !existingLike : false;
  const disliked = action === "dislike" ? !existingDislike : false;
  return NextResponse.json({ success: true, liked, disliked, count, dislikeCount });
}
