import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

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

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
