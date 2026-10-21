import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// Toggles the viewer's like on a comment and keeps the denormalised likeCount (used for "Most liked") in sync.
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const commentId = parseInt(String(body.id || ""), 10);
  const comment = Number.isNaN(commentId) ? null : await prisma.profileComment.findUnique({ where: { id: commentId }, select: { id: true, authorId: true } });
  if (!comment) return NextResponse.json({ success: false, error: "Comment not found." }, { status: 404 });
  if (comment.authorId === me.id) return NextResponse.json({ success: false, error: "You can't like your own comment." }, { status: 400 });

  const existing = await prisma.profileCommentLike.findUnique({ where: { commentId_userId: { commentId, userId: me.id } } });
  if (existing) {
    await prisma.$transaction([
      prisma.profileCommentLike.delete({ where: { id: existing.id } }),
      prisma.profileComment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } } }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.profileCommentLike.create({ data: { commentId, userId: me.id } }),
      prisma.profileComment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } }),
    ]);
  }

  const likeCount = await prisma.profileCommentLike.count({ where: { commentId } });
  return NextResponse.json({ success: true, liked: !existing, likeCount });
}
