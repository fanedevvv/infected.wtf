import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { parseStringArray } from "@/lib/json-array";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return NextResponse.json({ notifications, unread });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const action = String(body.action || "");

  if (action === "read_all") {
    await prisma.notification.updateMany({ where: { userId: user.id }, data: { isRead: true } });
    return NextResponse.json({ success: true });
  }

  if (action === "read_one") {
    const id = Number(body.id);
    if (id) await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { isRead: true } });
    return NextResponse.json({ success: true });
  }

  if (action === "delete_one") {
    const id = Number(body.id);
    if (id) await prisma.notification.deleteMany({ where: { id, userId: user.id } });
    return NextResponse.json({ success: true });
  }

  if (action === "infected_mail") {
    if (!user.isOwner) return NextResponse.json({ success: false, error: "Only owners can send Infected mails." }, { status: 403 });

    const title = String(body.title || "").trim();
    const msgBody = String(body.body || "").trim();
    const recipient = String(body.recipient || "").trim();
    const author = String(body.author || "Infected Team").trim();

    if (!title || !msgBody) return NextResponse.json({ success: false, error: "Title and description are required." });
    if (!["all", "premium", "verified", "content_creator"].includes(recipient)) {
      return NextResponse.json({ success: false, error: "Invalid recipient group." });
    }

    let targetIds: number[] = [];
    if (recipient === "all") {
      const rows = await prisma.user.findMany({ where: { emailVerified: true, banned: false }, select: { id: true } });
      targetIds = rows.map((r) => r.id);
    } else if (recipient === "premium") {
      const rows = await prisma.user.findMany({
        where: { isPremium: true, banned: false, OR: [{ premiumExpiresAt: null }, { premiumExpiresAt: { gt: new Date() } }] },
        select: { id: true },
      });
      targetIds = rows.map((r) => r.id);
    } else {
      const profiles = await prisma.profile.findMany({ select: { userId: true, badges: true } });
      const withBadge = profiles.filter((p) => (parseStringArray(p.badges)).includes(recipient)).map((p) => p.userId);
      if (withBadge.length > 0) {
        const rows = await prisma.user.findMany({ where: { id: { in: withBadge }, banned: false }, select: { id: true } });
        targetIds = rows.map((r) => r.id);
      }
    }

    if (targetIds.length === 0) return NextResponse.json({ success: false, error: "No users found for that recipient group." });

    const fullBody = msgBody + (author ? `\n— ${author}` : "");
    await prisma.notification.createMany({
      data: targetIds.map((uid) => ({ userId: uid, type: "announcement", title, body: fullBody, icon: "megaphone" })),
    });

    return NextResponse.json({ success: true, sent: targetIds.length, message: `Announcement sent to ${targetIds.length} user(s).` });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
