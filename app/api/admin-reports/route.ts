import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

const STATUSES = ["open", "resolved", "dismissed"] as const;

async function requireStaff() {
  const me = await getCurrentUser();
  if (!me || me.banned || !(me.isMod || me.isAdmin || me.isOwner)) return null;
  return me;
}

export async function GET(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const statusParam = req.nextUrl.searchParams.get("status") || "open";
  const status = (STATUSES as readonly string[]).includes(statusParam) ? statusParam : "open";

  const [reports, openCount] = await Promise.all([
    prisma.profileReport.findMany({
      where: { status },
      orderBy: { createdAt: status === "open" ? "asc" : "desc" },
      take: 100,
      include: {
        profile: { select: { slug: true, displayName: true, avatar: true, user: { select: { id: true, username: true, banned: true } } } },
        reporter: { select: { username: true } },
      },
    }),
    prisma.profileReport.count({ where: { status: "open" } }),
  ]);

  return NextResponse.json({
    success: true,
    openCount,
    reports: reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      reporter: r.reporter?.username ?? null,
      profile: {
        slug: r.profile.slug,
        displayName: r.profile.displayName || r.profile.user.username,
        avatar: r.profile.avatar,
        userId: r.profile.user.id,
        username: r.profile.user.username,
        banned: !!r.profile.user.banned,
      },
    })),
  });
}

// Marks a report resolved/dismissed (or reopens it). Moderation actions themselves (ban etc.) stay in the Staff tab.
export async function POST(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = parseInt(String(body.id || ""), 10);
  const status = String(body.status || "");
  if (Number.isNaN(id) || !(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ success: false, error: "Bad request." }, { status: 400 });
  }

  await prisma.profileReport.update({
    where: { id },
    data: { status, resolvedAt: status === "open" ? null : new Date() },
  });
  return NextResponse.json({ success: true });
}
