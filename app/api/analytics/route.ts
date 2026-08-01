import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 29);
  since.setUTCHours(0, 0, 0, 0);

  const rows = await prisma.viewsLog.groupBy({
    by: ["viewedAt"],
    where: { profileUserId: user.id, viewedAt: { gte: since } },
    _count: { _all: true },
  });
  const map = new Map(rows.map((r) => [r.viewedAt.toISOString().slice(0, 10), r._count._all]));

  const days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: map.get(key) ?? 0 });
  }

  const devices = await prisma.viewsLog.groupBy({
    by: ["deviceType"],
    where: { profileUserId: user.id },
    _count: { _all: true },
  });
  const countries = await prisma.viewsLog.groupBy({
    by: ["countryName"],
    where: { profileUserId: user.id },
    _count: { _all: true },
    orderBy: { _count: { profileUserId: "desc" } },
    take: 5,
  });

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  const linkClicks = await prisma.linkClick.count({ where: { profileUserId: user.id } });

  return NextResponse.json({
    totalViews: profile?.views ?? 0,
    localViews: profile?.localViews ?? 0,
    linkClicks,
    days,
    devices: devices.map((d) => ({ type: d.deviceType, count: d._count._all })),
    topCountries: countries.map((c) => ({ country: c.countryName, count: c._count._all })),
  });
}
