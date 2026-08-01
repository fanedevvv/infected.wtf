import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isStaff, isAdminUser } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!isStaff(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q") || "";
  const users = await prisma.user.findMany({
    where: q ? { username: { contains: q } } : undefined,
    select: {
      id: true, username: true, isAdmin: true, isOwner: true, isMod: true,
      banned: true, banUntil: true, tokens: true, createdAt: true,
    },
    orderBy: { id: "desc" },
    take: 50,
  });
  return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
  const me = await getCurrentUser();
  if (!isStaff(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const targetId = Number(body.targetId);
  const action = String(body.action || "");
  if (!targetId) return NextResponse.json({ error: "Missing target." }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  // Only admins/owners can touch roles; mods can only ban/unban
  const rolesActions = ["grant_admin", "revoke_admin", "grant_mod", "revoke_mod"];
  if (rolesActions.includes(action) && !isAdminUser(me)) {
    return NextResponse.json({ error: "Only admins can change roles." }, { status: 403 });
  }
  if (target.isOwner && me!.id !== target.id) {
    return NextResponse.json({ error: "Cannot modify an owner." }, { status: 403 });
  }

  switch (action) {
    case "ban":
      await prisma.user.update({ where: { id: targetId }, data: { banned: true, banUntil: body.until ? new Date(body.until) : null } });
      break;
    case "unban":
      await prisma.user.update({ where: { id: targetId }, data: { banned: false, banUntil: null } });
      break;
    case "grant_admin":
      await prisma.user.update({ where: { id: targetId }, data: { isAdmin: true } });
      break;
    case "revoke_admin":
      await prisma.user.update({ where: { id: targetId }, data: { isAdmin: false } });
      break;
    case "grant_mod":
      await prisma.user.update({ where: { id: targetId }, data: { isMod: true } });
      break;
    case "revoke_mod":
      await prisma.user.update({ where: { id: targetId }, data: { isMod: false } });
      break;
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
