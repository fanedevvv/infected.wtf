import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

const DAYS_MAP: Record<string, number> = { "1d": 1, "3d": 3, "7d": 7, "30d": 30, "90d": 90 };

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" });
  }
  const userId = user.id;

  const range = req.nextUrl.searchParams.get("range") || "7d";
  const days = DAYS_MAP[range] ?? 7;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setUTCDate(startDate.getUTCDate() - days);

  const viewsRaw = await prisma.viewsLog.groupBy({
    by: ["viewedAt"],
    where: { profileUserId: userId, viewedAt: { gte: startDate } },
    _count: { _all: true },
  });
  const viewsMap = new Map<string, number>();
  for (const r of viewsRaw) viewsMap.set(ymd(r.viewedAt), r._count._all);

  const labels: string[] = [];
  const data: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = ymd(d);
    labels.push(
      days <= 3
        ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    );
    data.push(viewsMap.get(key) ?? 0);
  }

  const deviceRaw = await prisma.viewsLog.groupBy({
    by: ["deviceType"],
    where: { profileUserId: userId, viewedAt: { gte: startDate } },
    _count: { _all: true },
  });
  const devices = { desktop: 0, mobile: 0, tablet: 0 };
  for (const d of deviceRaw) {
    const key = d.deviceType || "desktop";
    if (key in devices) devices[key as keyof typeof devices] = d._count._all;
    else devices.desktop += d._count._all;
  }

  const countryRaw = await prisma.viewsLog.groupBy({
    by: ["countryCode", "countryName"],
    where: { profileUserId: userId, viewedAt: { gte: startDate } },
    _count: { _all: true },
    orderBy: { _count: { profileUserId: "desc" } },
    take: 8,
  });
  const countries = countryRaw
    .map((c) => ({ code: c.countryCode || "XX", name: c.countryName || "Unknown", cnt: c._count._all }))
    .sort((a, b) => b.cnt - a.cnt);
  const totalCtrViews = countries.reduce((s, c) => s + c.cnt, 0);

  const browserRaw = await prisma.viewsLog.groupBy({
    by: ["browser"],
    where: { profileUserId: userId, viewedAt: { gte: startDate } },
    _count: { _all: true },
    orderBy: { _count: { profileUserId: "desc" } },
    take: 8,
  });
  const browsers = browserRaw.map((b) => ({ browser: b.browser || "Unknown", cnt: b._count._all })).sort((a, b) => b.cnt - a.cnt);

  const osRaw = await prisma.viewsLog.groupBy({
    by: ["osName"],
    where: { profileUserId: userId, viewedAt: { gte: startDate } },
    _count: { _all: true },
    orderBy: { _count: { profileUserId: "desc" } },
    take: 8,
  });
  const os = osRaw.map((o) => ({ os_name: o.osName || "Unknown", cnt: o._count._all })).sort((a, b) => b.cnt - a.cnt);

  const linksRaw = await prisma.linkClick.groupBy({
    by: ["linkId", "linkTitle", "linkUrl"],
    where: { profileUserId: userId, clickedAt: { gte: startDate } },
    _count: { _all: true },
    orderBy: { _count: { profileUserId: "desc" } },
    take: 8,
  });
  const topLinks = linksRaw
    .map((l) => ({ link_id: l.linkId, link_title: l.linkTitle, link_url: l.linkUrl, cnt: l._count._all }))
    .sort((a, b) => b.cnt - a.cnt);
  const totalLinkClicks = topLinks.reduce((s, l) => s + l.cnt, 0);

  const totalViews = data.reduce((a, b) => a + b, 0);
  const peakViews = data.length ? Math.max(...data) : 0;
  const dailyAvg = days > 0 ? Math.round((totalViews / days) * 10) / 10 : 0;
  const todayViews = viewsMap.get(ymd(today)) ?? 0;

  return NextResponse.json({
    labels,
    data,
    devices,
    countries,
    total_ctr_views: totalCtrViews,
    browsers,
    os,
    top_links: topLinks,
    total_link_clicks: totalLinkClicks,
    stats: {
      total: totalViews,
      peak: peakViews,
      daily_avg: dailyAvg,
      today: todayViews,
      days,
    },
  });
}
