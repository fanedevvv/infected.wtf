import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  }
  const userId = user.id;
  const body = await req.json();
  const action = String(body.action || "");

  if (action === "toggle_hidden") {
    const badgeId = String(body.badge_id || "");
    const hidden = !!body.hidden;
    if (!badgeId) return NextResponse.json({ success: false, error: "Missing badge_id." });

    const profile = await prisma.profile.findFirst({ where: { userId, isPrimary: true }, select: { badgeHidden: true } });
    const set = new Set((profile?.badgeHidden as string[] | null) ?? []);
    if (hidden) set.add(badgeId);
    else set.delete(badgeId);
    await prisma.profile.updateMany({ where: { userId, isPrimary: true }, data: { badgeHidden: Array.from(set) } });
    return NextResponse.json({ success: true });
  }

  if (action === "save_order") {
    const order = Array.isArray(body.order) ? body.order.map(String) : [];
    await prisma.profile.updateMany({ where: { userId, isPrimary: true }, data: { badgeOrder: order } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: "Unknown action." });
}
