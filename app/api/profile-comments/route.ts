import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

const PAGE_SIZE = 20;
const MAX_LENGTH = 500;
const COOLDOWN_SECONDS = 20;

type Viewer = Awaited<ReturnType<typeof getCurrentUser>>;

const isModerator = (u: NonNullable<Viewer>) => !!(u.isMod || u.isAdmin || u.isOwner);

const commentInclude = {
  author: {
    select: {
      username: true,
      profiles: { where: { isPrimary: true }, select: { slug: true, displayName: true, avatar: true }, take: 1 },
    },
  },
} as const;

type CommentRow = Awaited<ReturnType<typeof prisma.profileComment.findMany<{ include: typeof commentInclude }>>>[number];

function serialize(c: CommentRow, viewer: Viewer, profileOwnerId: number, likedIds: Set<number>) {
  const authorProfile = c.author.profiles[0];
  return {
    id: c.id,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    likeCount: c.likeCount,
    likedByViewer: likedIds.has(c.id),
    canDelete: !!viewer && (viewer.id === c.authorId || viewer.id === profileOwnerId || isModerator(viewer)),
    isOwn: viewer?.id === c.authorId,
    author: {
      username: c.author.username,
      slug: authorProfile?.slug ?? null,
      displayName: authorProfile?.displayName || c.author.username,
      avatar: authorProfile?.avatar ?? null,
    },
  };
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") || "";
  const sort = req.nextUrl.searchParams.get("sort") || "newest";
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") || "0", 10) || 0);

  const profile = await prisma.profile.findUnique({ where: { slug }, select: { id: true, userId: true } });
  if (!profile) return NextResponse.json({ success: false, error: "Profile not found." }, { status: 404 });

  const viewer = await getCurrentUser();
  const orderBy =
    sort === "oldest" ? [{ createdAt: "asc" as const }, { id: "asc" as const }]
    : sort === "top" ? [{ likeCount: "desc" as const }, { createdAt: "desc" as const }]
    : [{ createdAt: "desc" as const }, { id: "desc" as const }];

  const [rows, total] = await Promise.all([
    prisma.profileComment.findMany({ where: { profileId: profile.id }, orderBy, skip: offset, take: PAGE_SIZE + 1, include: commentInclude }),
    prisma.profileComment.count({ where: { profileId: profile.id } }),
  ]);
  const page = rows.slice(0, PAGE_SIZE);

  const likedIds = new Set<number>();
  if (viewer && page.length > 0) {
    const likes = await prisma.profileCommentLike.findMany({
      where: { userId: viewer.id, commentId: { in: page.map((c) => c.id) } },
      select: { commentId: true },
    });
    likes.forEach((l) => likedIds.add(l.commentId));
  }

  return NextResponse.json({
    success: true,
    total,
    hasMore: rows.length > PAGE_SIZE,
    comments: page.map((c) => serialize(c, viewer, profile.userId, likedIds)),
  });
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Log in to leave a comment." }, { status: 401 });
  if (me.banned) return NextResponse.json({ success: false, error: "Your account is suspended." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug || "").trim();
  const text = String(body.body || "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return NextResponse.json({ success: false, error: "Write something first." }, { status: 400 });
  if (text.length > MAX_LENGTH) return NextResponse.json({ success: false, error: `Comments can be at most ${MAX_LENGTH} characters.` }, { status: 400 });

  const profile = await prisma.profile.findUnique({ where: { slug }, select: { id: true, userId: true, slug: true, user: { select: { banned: true } } } });
  if (!profile || profile.user.banned) return NextResponse.json({ success: false, error: "Profile not found." }, { status: 404 });

  const last = await prisma.profileComment.findFirst({ where: { authorId: me.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  const secsLeft = last ? COOLDOWN_SECONDS - Math.floor((Date.now() - last.createdAt.getTime()) / 1000) : 0;
  if (secsLeft > 0) return NextResponse.json({ success: false, error: `Slow down — you can comment again in ${secsLeft}s.` }, { status: 429 });

  const comment = await prisma.profileComment.create({
    data: { profileId: profile.id, authorId: me.id, body: text },
    include: commentInclude,
  });

  if (profile.userId !== me.id) {
    await prisma.notification.create({
      data: {
        userId: profile.userId,
        type: "comment",
        title: "New comment on your profile 💬",
        body: `@${me.username}: ${text.length > 120 ? `${text.slice(0, 117)}…` : text}`,
        icon: "bell",
        link: `/${profile.slug}#comments`,
      },
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, comment: serialize(comment, me, profile.userId, new Set()) });
}

export async function DELETE(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = parseInt(String(body.id || ""), 10);
  const comment = Number.isNaN(id) ? null : await prisma.profileComment.findUnique({ where: { id }, include: { profile: { select: { userId: true } } } });
  if (!comment) return NextResponse.json({ success: false, error: "Comment not found." }, { status: 404 });

  const allowed = comment.authorId === me.id || comment.profile.userId === me.id || isModerator(me);
  if (!allowed) return NextResponse.json({ success: false, error: "You can't delete this comment." }, { status: 403 });

  await prisma.profileComment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
