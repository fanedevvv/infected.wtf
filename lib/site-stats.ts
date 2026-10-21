import { prisma } from "./prisma";

export type DayPoint = { date: string; value: number };
export type Share = { label: string; value: number };

export type SiteStats = {
  generatedAt: string;
  totals: {
    users: number;
    pages: number;
    views: number;
    likes: number;
    comments: number;
    linkClicks: number;
    projects: number;
    plus: number;
  };
  today: { views: number; signups: number };
  last30: { views: number; signups: number };
  viewsByDay: DayPoint[];
  signupsByDay: DayPoint[];
  countries: Share[];
  devices: Share[];
  browsers: Share[];
  topProfiles: { slug: string; displayName: string; avatar: string | null; views: number }[];
  newest: { slug: string; displayName: string; avatar: string | null }[];
};

const DAYS = 30;
const CACHE_MS = 60_000;
let cache: { at: number; data: SiteStats } | null = null;

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/** The log stores ISO codes for most visitors; show "Romania" rather than "RO". */
function countryLabel(value: string | null): string | null {
  if (!value || !/^[A-Z]{2}$/.test(value) || value === "XX") return value;
  try {
    return regionNames.of(value) ?? value;
  } catch {
    return value;
  }
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Fills missing days with 0 so charts always show a full 30-day window. */
function fillDays(rows: { d: Date | string; c: bigint | number }[], since: Date): DayPoint[] {
  const map = new Map(rows.map((r) => [typeof r.d === "string" ? r.d.slice(0, 10) : dayKey(r.d), Number(r.c)]));
  return Array.from({ length: DAYS }, (_, i) => {
    const date = dayKey(new Date(since.getTime() + i * 86400000));
    return { date, value: map.get(date) ?? 0 };
  });
}

function shares(rows: { label: string | null; _count: { _all: number } }[], limit: number): Share[] {
  return rows
    .map((r) => ({ label: r.label || "Unknown", value: r._count._all }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

async function compute(): Promise<SiteStats> {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const since = new Date(todayStart.getTime() - (DAYS - 1) * 86400000);
  // `banned` is nullable; NOT true would also drop NULL rows in SQL, so list both "not banned" states.
  const publicUser = { OR: [{ banned: false }, { banned: null }] };

  const [
    users, pages, viewsAgg, likes, comments, linkClicks, projects, plus,
    viewRows, signupRows, countryRows, deviceRows, browserRows, top, newest,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.profile.count(),
    prisma.profile.aggregate({ _sum: { views: true } }),
    prisma.profileLike.count(),
    prisma.profileComment.count(),
    prisma.linkClick.count(),
    prisma.profileProject.count({ where: { status: "approved" } }),
    prisma.user.count({ where: { isPremium: true, OR: [{ premiumExpiresAt: null }, { premiumExpiresAt: { gt: now } }] } }),
    prisma.$queryRaw<{ d: Date; c: bigint }[]>`SELECT viewed_at AS d, COUNT(*) AS c FROM views_log WHERE viewed_at >= ${since} GROUP BY viewed_at`,
    prisma.$queryRaw<{ d: Date; c: bigint }[]>`SELECT DATE(created_at) AS d, COUNT(*) AS c FROM users WHERE created_at >= ${since} GROUP BY DATE(created_at)`,
    prisma.viewsLog.groupBy({ by: ["countryName"], _count: { _all: true }, where: { viewedAt: { gte: since } } }),
    prisma.viewsLog.groupBy({ by: ["deviceType"], _count: { _all: true }, where: { viewedAt: { gte: since } } }),
    prisma.viewsLog.groupBy({ by: ["browser"], _count: { _all: true }, where: { viewedAt: { gte: since } } }),
    prisma.profile.findMany({
      where: { isPrimary: true, user: publicUser },
      orderBy: { views: "desc" },
      take: 10,
      select: { slug: true, displayName: true, avatar: true, views: true, user: { select: { username: true } } },
    }),
    prisma.profile.findMany({
      where: { isPrimary: true, user: publicUser },
      orderBy: { id: "desc" },
      take: 8,
      select: { slug: true, displayName: true, avatar: true, user: { select: { username: true } } },
    }),
  ]);

  const viewsByDay = fillDays(viewRows, since);
  const signupsByDay = fillDays(signupRows, since);
  const todayKey = dayKey(todayStart);

  return {
    generatedAt: now.toISOString(),
    totals: { users, pages, views: viewsAgg._sum.views ?? 0, likes, comments, linkClicks, projects, plus },
    today: {
      views: viewsByDay.find((p) => p.date === todayKey)?.value ?? 0,
      signups: signupsByDay.find((p) => p.date === todayKey)?.value ?? 0,
    },
    last30: {
      views: viewsByDay.reduce((s, p) => s + p.value, 0),
      signups: signupsByDay.reduce((s, p) => s + p.value, 0),
    },
    viewsByDay,
    signupsByDay,
    countries: shares(countryRows.map((r) => ({ label: countryLabel(r.countryName), _count: r._count })), 8),
    devices: shares(deviceRows.map((r) => ({ label: r.deviceType ? r.deviceType[0].toUpperCase() + r.deviceType.slice(1) : null, _count: r._count })), 4),
    browsers: shares(browserRows.map((r) => ({ label: r.browser, _count: r._count })), 6),
    topProfiles: top.map((p) => ({ slug: p.slug, displayName: p.displayName || p.user.username, avatar: p.avatar, views: p.views ?? 0 })),
    newest: newest.map((p) => ({ slug: p.slug, displayName: p.displayName || p.user.username, avatar: p.avatar })),
  };
}

/** Public, aggregate-only site statistics (no per-visitor data), cached for a minute. */
export async function getSiteStats(): Promise<SiteStats> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  const data = await compute();
  cache = { at: Date.now(), data };
  return data;
}
