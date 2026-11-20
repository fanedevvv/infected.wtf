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
