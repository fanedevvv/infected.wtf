import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

const STATUSES = ["pending", "approved", "rejected"] as const;

async function requireStaff() {
  const me = await getCurrentUser();
  if (!me || me.banned || !(me.isMod || me.isAdmin || me.isOwner)) return null;
  return me;
}

export async function GET(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const statusParam = req.nextUrl.searchParams.get("status") || "pending";
  const status = (STATUSES as readonly string[]).includes(statusParam) ? statusParam : "pending";

  const [projects, pendingCount] = await Promise.all([
    prisma.profileProject.findMany({
      where: { status },
      orderBy: { createdAt: status === "pending" ? "asc" : "desc" },
      take: 100,
      include: { profile: { select: { slug: true, displayName: true, user: { select: { username: true } } } } },
    }),
    prisma.profileProject.count({ where: { status: "pending" } }),
  ]);

  return NextResponse.json({
    success: true,
    pendingCount,
    projects: projects.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      url: p.url,
      repoUrl: p.repoUrl,
      technologies: p.technologies,
      image: p.image,
      status: p.status,
      rejectReason: p.rejectReason,
      createdAt: p.createdAt.toISOString(),
      profile: { slug: p.profile.slug, displayName: p.profile.displayName || p.profile.user.username, username: p.profile.user.username },
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = parseInt(String(body.id || ""), 10);
  const status = String(body.status || "");
  const reason = String(body.reason || "").trim().slice(0, 300) || null;
  if (Number.isNaN(id) || !(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ success: false, error: "Bad request." }, { status: 400 });
  }

  const project = await prisma.profileProject.update({
    where: { id },
    data: { status, rejectReason: status === "rejected" ? reason : null, reviewedAt: status === "pending" ? null : new Date() },
    include: { profile: { select: { userId: true } } },
  });

  if (status !== "pending") {
    await prisma.notification.create({
      data: {
        userId: project.profile.userId,
        type: "project",
        title: status === "approved" ? "Project approved ✅" : "Project rejected",
        body: status === "approved" ? `"${project.title}" is now live on your profile.` : `"${project.title}" was rejected${reason ? `: ${reason}` : "."}`,
        icon: "bell",
        link: "/dashboard?page=projects",
      },
    }).catch(() => {});
  }
  return NextResponse.json({ success: true });
}
