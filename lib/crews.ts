import { prisma } from "./prisma";

// Crews: a group with a 2–4 character tag shown next to every member's name across the site, a public page
// (/c/TAG) and a leaderboard (/crews). Like Discord's server tags.

export const CREW_TAG_RE = /^[A-Z0-9]{2,4}$/;
export const CREW_CREATE_COST = 500; // tokens; free with Infected Plus
export const CREW_MAX_MEMBERS = 25;
export const CREW_MAX_MEMBERS_PLUS = 50; // when the owner has Infected Plus

// Tags nobody can take (impersonating staff/the site, slurs). Staff can still disband anything that slips through.
const BLOCKED_TAGS = new Set(["ADM", "ADMN", "MOD", "MODS", "STAF", "OWNR", "INFC", "WTF", "NIGG", "NIGA", "FAG", "KKK", "NAZI", "HTLR", "RAPE", "CUNT"]);
export function tagProblem(tag: string): string | null {
  if (!CREW_TAG_RE.test(tag)) return "The tag must be 2–4 letters or numbers.";
  if (BLOCKED_TAGS.has(tag)) return "That tag isn't available.";
  return null;
}

export { CREW_EMBLEMS } from "./crew-emblems";

export type CrewTag = { tag: string; color: string; name: string };

/** Crew tags for many users in one query (comments, leaderboard). */
export async function crewTagsFor(userIds: number[]): Promise<Map<number, CrewTag>> {
  const ids = [...new Set(userIds)].filter((n) => Number.isInteger(n));
  if (ids.length === 0) return new Map();
  const rows = await prisma.crewMember.findMany({ where: { userId: { in: ids } }, select: { userId: true, crew: { select: { tag: true, color: true, name: true } } } });
  return new Map(rows.map((r) => [r.userId, r.crew]));
}

export async function crewTagFor(userId: number): Promise<CrewTag | null> {
  return (await crewTagsFor([userId])).get(userId) ?? null;
}

/** Members' total views (their primary pages) — the crew leaderboard score. */
export async function crewViews(crewIds: number[]): Promise<Map<number, number>> {
  if (crewIds.length === 0) return new Map();
  const members = await prisma.crewMember.findMany({ where: { crewId: { in: crewIds } }, select: { crewId: true, userId: true } });
  const profiles = await prisma.profile.findMany({ where: { userId: { in: members.map((m) => m.userId) }, isPrimary: true }, select: { userId: true, views: true } });
  const byUser = new Map(profiles.map((p) => [p.userId, p.views ?? 0]));
  const out = new Map<number, number>();
  for (const m of members) out.set(m.crewId, (out.get(m.crewId) ?? 0) + (byUser.get(m.userId) ?? 0));
  return out;
}

export const isHexColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);

/* ── Groups: boosts, levels, perks (like Discord server boosts) ── */

export const BOOST_COST = 250; // tokens per 30-day boost
export const BOOST_COST_PLUS = 150; // with Infected Plus
export const BOOST_DAYS = 30;

export const GROUP_LEVELS = [
  { level: 0, boosts: 0, cap: 25, perks: ["Custom icon & banner"] },
  { level: 1, boosts: 2, cap: 35, perks: ["Profile strip", "35 members"] },
  { level: 2, boosts: 7, cap: 50, perks: ["Animated icon, banner & strip", "50 members"] },
  { level: 3, boosts: 14, cap: 100, perks: ["100 members", "Gold level gem"] },
] as const;

export function levelFor(boosts: number) {
  return [...GROUP_LEVELS].reverse().find((l) => boosts >= l.boosts) ?? GROUP_LEVELS[0];
}
/** Member cap: the level's cap, +25 when the owner has Infected Plus. */
export const memberCap = (boosts: number, ownerPlus: boolean) => levelFor(boosts).cap + (ownerPlus ? 25 : 0);
export const canUseStrip = (boosts: number) => levelFor(boosts).level >= 1;
export const canAnimate = (boosts: number) => levelFor(boosts).level >= 2;

export async function activeBoosts(crewIds: number[]): Promise<Map<number, number>> {
  if (crewIds.length === 0) return new Map();
  const rows = await prisma.crewBoost.groupBy({ by: ["crewId"], where: { crewId: { in: crewIds }, expiresAt: { gt: new Date() } }, _count: { _all: true } });
  return new Map(rows.map((r) => [r.crewId, r._count._all]));
}

export type GroupLink = { label: string; url: string };
export function parseGroupLinks(raw: string | null | undefined): GroupLink[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v.filter((l) => l && typeof l.url === "string" && /^https?:\/\//.test(l.url)).slice(0, 6) : [];
  } catch {
    return [];
  }
}

/** Everything the group pill + sheet on a member's profile needs. */
export type GroupCard = {
  tag: string; name: string; color: string; emblem: string; icon: string | null; strip: string | null;
  level: number; boosts: number; memberCount: number;
  members: { slug: string; name: string; avatar: string | null; owner: boolean }[];
};
export async function groupCardFor(userId: number): Promise<GroupCard | null> {
  const m = await prisma.crewMember.findUnique({ where: { userId }, select: { crew: true } });
  if (!m) return null;
  const c = m.crew;
  const [members, memberCount, boosts] = await Promise.all([
    prisma.crewMember.findMany({
      where: { crewId: c.id, user: { banned: false } }, orderBy: [{ joinedAt: "asc" }], take: 10,
      select: { userId: true, user: { select: { username: true, profiles: { where: { isPrimary: true }, take: 1, select: { slug: true, displayName: true, avatar: true } } } } },
    }),
    prisma.crewMember.count({ where: { crewId: c.id } }),
    activeBoosts([c.id]).then((b) => b.get(c.id) ?? 0),
  ]);
  return {
    tag: c.tag, name: c.name, color: c.color, emblem: c.emblem, icon: c.icon, strip: canUseStrip(boosts) ? c.strip : null,
    level: levelFor(boosts).level, boosts, memberCount,
    members: members
      .map((x) => ({ slug: x.user.profiles[0]?.slug ?? x.user.username, name: x.user.profiles[0]?.displayName || x.user.username, avatar: x.user.profiles[0]?.avatar ?? null, owner: x.userId === c.ownerId }))
      .sort((a, b) => Number(b.owner) - Number(a.owner)),
  };
}
