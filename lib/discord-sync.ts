import { prisma } from "./prisma";
import { parseStringArray } from "./json-array";

/**
 * Full site → Discord role sync. Works out every role a user should have from their site state and asks the
 * bot to make the member's roles match: missing site roles are added, site roles they no longer earn are
 * removed, roles that don't belong to the site are left alone.
 *
 * Role keys are the bot's BADGE_ROLE_MAP keys plus "infected", "premium" and "mod".
 */

// Badges whose Discord role follows the badge itself. Staff roles follow the user's flags instead, so a stale
// "owner"/"admin" badge left on a profile can never hand out a staff role.
const BADGE_KEYS = new Set([
  "verified", "champion", "hall_of_fame", "fresh", "lover", "known", "rich", "trapstar", "the_killer",
  "crew", "billionaire", "content_creator", "designer", "discord", "og", "views_master", "promoter", "promoter_elite",
]);

export type DesiredRoles = { discordId: string; keys: string[]; dynamicRoleIds: string[] };

/** User ids whose profile is in the top 3 by views (Views Master). Computed once per batch. */
async function viewsMasterUserIds(): Promise<Set<number>> {
  const top3 = await prisma.profile.findMany({ orderBy: { views: "desc" }, take: 3, select: { userId: true } });
  return new Set(top3.map((p) => p.userId));
}

/**
 * Grades the site works out on the fly instead of storing on the profile — same rules as the Badges page
 * (lib/badges.ts getDashboardBadgeState): OG = one of the first 1,000 accounts, Views Master = top 3 profiles,
 * Hall of Fame / Champion = 1,000 / 10,000 views on the primary page, Promoter / Promoter Elite = 10 / 20 referrals.
 */
async function derivedGrades(userId: number, topViews: Set<number>): Promise<string[]> {
  const out: string[] = [];
  const rank = await prisma.user.count({ where: { id: { lte: userId } } });
  if (rank <= 1000) out.push("og");
  if (topViews.has(userId)) out.push("views_master");
  const primary = await prisma.profile.findFirst({ where: { userId, isPrimary: true }, select: { views: true } });
  const views = primary?.views ?? 0;
  if (views >= 1000) out.push("hall_of_fame");
  if (views >= 10000) out.push("champion");
  const refs = await prisma.referral.count({ where: { referrerId: userId } });
  if (refs >= 20) out.push("promoter_elite");
  else if (refs >= 10) out.push("promoter");
  return out;
}

function isPremiumActive(u: { isPremium: boolean | null; premiumExpiresAt: Date | null }) {
  return !!u.isPremium && (!u.premiumExpiresAt || u.premiumExpiresAt.getTime() > Date.now());
}

async function dynamicRoleMap(): Promise<Map<string, string>> {
  const rows = await prisma.dynamicBadge.findMany({ where: { discordRoleId: { not: null } }, select: { badgeKey: true, discordRoleId: true } });
  return new Map(rows.map((r) => [r.badgeKey, r.discordRoleId as string]));
}

/** Every role the user should have on Discord, or null when they have no linked Discord account. */
export async function desiredDiscordRoles(userId: number, dynamic?: Map<string, string>, topViews?: Set<number>): Promise<DesiredRoles | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isOwner: true, isAdmin: true, isMod: true, isPremium: true, premiumExpiresAt: true, banned: true },
  });
  const integration = await prisma.integration.findFirst({ where: { userId, type: "discord" }, select: { discordUserId: true } });
  if (!user || !integration?.discordUserId) return null;
  // A banned account keeps nothing (the ban itself is synced separately).
  if (user.banned) return { discordId: integration.discordUserId, keys: [], dynamicRoleIds: [] };

  const profiles = await prisma.profile.findMany({ where: { userId }, select: { badges: true } });
  const owned = new Set(profiles.flatMap((p) => parseStringArray(p.badges)));
  const dyn = dynamic ?? (await dynamicRoleMap());

  const keys = new Set<string>(["infected", "discord"]);
  for (const b of owned) if (BADGE_KEYS.has(b)) keys.add(b);
  for (const g of await derivedGrades(userId, topViews ?? (await viewsMasterUserIds()))) keys.add(g);
  // Elite replaces Promoter (one referral role at a time), even if an old "promoter" badge is still stored.
  if (keys.has("promoter_elite")) keys.delete("promoter");
  if (user.isOwner) keys.add("owner");
  if (user.isOwner || user.isAdmin) keys.add("admin");
  if (user.isMod && !user.isAdmin && !user.isOwner) keys.add("mod");
  if (isPremiumActive(user)) keys.add("premium");

  const dynamicRoleIds = [...owned].filter((b) => b.startsWith("dc_")).map((b) => dyn.get(b)).filter((id): id is string => !!id);
  return { discordId: integration.discordUserId, keys: [...keys], dynamicRoleIds };
}

/** Desired roles for every linked account — the bot pulls this for its periodic full reconcile. */
export async function allDesiredDiscordRoles(): Promise<DesiredRoles[]> {
  const dyn = await dynamicRoleMap();
  const top = await viewsMasterUserIds();
  const linked = await prisma.integration.findMany({ where: { type: "discord", discordUserId: { not: null } }, select: { userId: true } });
  const out: DesiredRoles[] = [];
  for (const { userId } of linked) {
    const d = await desiredDiscordRoles(userId, dyn, top);
    if (d) out.push(d);
  }
  return out;
}

export type SyncResult = { success: boolean; inGuild?: boolean; added?: number; removed?: number; error?: string };

async function postToBot(body: Record<string, unknown>, timeoutMs = 5000): Promise<SyncResult> {
  const botUrl = process.env.DISCORD_BOT_URL;
  if (!botUrl) return { success: false, error: "Discord bot is not configured." };
  try {
    const res = await fetch(`${botUrl.replace(/\/$/, "")}/sync-member`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": process.env.DISCORD_BOT_API_KEY || "" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await res.json().catch(() => null);
    if (!data?.success) return { success: false, error: data?.error || `Bot answered ${res.status}` };
    return { success: true, inGuild: data.in_guild, added: data.added, removed: data.removed };
  } catch {
    return { success: false, error: "Discord bot is unreachable." };
  }
}

/** Makes the user's Discord roles match the site right now. Safe to call after any change; never throws. */
export async function syncDiscordRoles(userId: number): Promise<SyncResult> {
  try {
    const desired = await desiredDiscordRoles(userId);
    if (!desired) return { success: false, error: "No linked Discord account." };
    return await postToBot({ discord_id: desired.discordId, keys: desired.keys, dynamic_role_ids: desired.dynamicRoleIds });
  } catch (e) {
    console.error("[discord-sync]", e);
    return { success: false, error: "Sync failed." };
  }
}

/** Strips the site's grade roles from a Discord account when it's unlinked. "infected" stays: it's also the
 *  server's verified-member role (#verify), so unlinking must not lock someone out of the server. */
export async function clearDiscordRoles(discordId: string): Promise<SyncResult> {
  return postToBot({ discord_id: discordId, keys: ["infected"], dynamic_role_ids: [] });
}
