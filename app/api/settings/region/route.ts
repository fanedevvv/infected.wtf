import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const code = String(body.regionCode || "").trim().toUpperCase();
  const name = String(body.regionName || "").trim();

  if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return NextResponse.json({ error: "Invalid region code." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Invalid region name." }, { status: 400 });

  await prisma.user.update({ where: { id: user.id }, data: { leaderboardRegionCode: code, leaderboardRegionName: name } });

  const localCount = await prisma.viewsLog.count({ where: { profileUserId: user.id, countryCode: code } });
  await prisma.profile.updateMany({ where: { userId: user.id , isPrimary: true }, data: { localViews: localCount } });

  return NextResponse.json({ success: true, localViews: localCount });
}
