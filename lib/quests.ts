import { prisma } from "./prisma";

// Quests: daily, weekly and one-time goals with token and exclusive collectible rewards (like Discord Quests).
// Progress is computed from what already happens on the site (views, comments, likes, spins, integrations…), so it
// can never drift; only the claim is stored (quest_claims, unique per user/quest/period → no double claims).

export type QuestPeriod = "daily" | "weekly" | "once";
export type QuestReward = { tokens?: number; nameplate?: string; effect?: string };
export type QuestDef = { id: string; period: QuestPeriod; title: string; desc: string; goal: number; reward: QuestReward };

export const QUESTS: QuestDef[] = [
  { id: "daily_spin", period: "daily", title: "Feeling lucky", desc: "Spin the Daily Spin.", goal: 1, reward: { tokens: 20 } },
  { id: "daily_visitors", period: "daily", title: "Get noticed", desc: "Get 10 new visitors on your profile today.", goal: 10, reward: { tokens: 30 } },
  { id: "daily_comment", period: "daily", title: "Say hi", desc: "Leave a comment on someone else's profile.", goal: 1, reward: { tokens: 15 } },
  { id: "weekly_visitors", period: "weekly", title: "Spreading", desc: "Get 100 new visitors this week.", goal: 100, reward: { tokens: 150 } },
  { id: "weekly_likes", period: "weekly", title: "Show some love", desc: "Like 5 profiles this week.", goal: 5, reward: { tokens: 60 } },
  { id: "weekly_comments", period: "weekly", title: "Social butterfly", desc: "Comment on 5 profiles this week.", goal: 5, reward: { tokens: 70 } },
  { id: "once_discord", period: "once", title: "Plug in", desc: "Link your Discord account.", goal: 1, reward: { tokens: 100 } },
  { id: "once_links", period: "once", title: "All my socials", desc: "Add 3 links to your profile.", goal: 3, reward: { tokens: 50 } },
  { id: "once_layout", period: "once", title: "Make it yours", desc: "Pick a layout other than Modern.", goal: 1, reward: { tokens: 50 } },
  { id: "once_crew", period: "once", title: "Squad up", desc: "Create or join a crew.", goal: 1, reward: { tokens: 80 } },
  { id: "once_collectible", period: "once", title: "Collector", desc: "Equip a nameplate or a profile effect.", goal: 1, reward: { tokens: 60 } },
  { id: "once_referral", period: "once", title: "Patient zero", desc: "Invite a friend with your referral link.", goal: 1, reward: { tokens: 120 } },
  { id: "milestone_10", period: "once", title: "Quest runner", desc: "Complete 10 quests.", goal: 10, reward: { nameplate: "questrunner" } },
  { id: "milestone_once_all", period: "once", title: "Completionist", desc: "Finish every one-time quest above.", goal: 6, reward: { effect: "completionist" } },
];

const ONE_TIME_IDS = ["once_discord", "once_links", "once_layout", "once_crew", "once_collectible", "once_referral"];

/** Period keys in UTC: daily "2026-11-20", weekly ISO "2026-W47", once "once". */
export function periodKey(period: QuestPeriod, d = new Date()): string {
  if (period === "once") return "once";
  if (period === "daily") return d.toISOString().slice(0, 10);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const week = Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function periodStart(period: QuestPeriod, d = new Date()): Date {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (period === "weekly") start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() || 7) - 1));
  return start;
}

/** Each quest's progress (capped at its goal) for one user, right now. */
export async function questProgress(userId: number): Promise<Record<string, number>> {
  const today = periodStart("daily");
  const week = periodStart("weekly");
  const [user, profiles, discord, linkCount, crew, visitorsToday, visitorsWeek, commentsToday, commentsWeek, likesWeek, referral, claims] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { lastDailySpinAt: true } }),
    prisma.profile.findMany({ where: { userId }, select: { id: true, layoutTemplate: true, activeNameplate: true, activeProfileEffect: true } }),
    prisma.integration.findFirst({ where: { userId, type: "discord", discordUserId: { not: null } }, select: { id: true } }),
    prisma.socialLink.count({ where: { userId } }),
    prisma.crewMember.findUnique({ where: { userId }, select: { id: true } }),
    prisma.viewsLog.count({ where: { profileUserId: userId, viewedAt: { gte: today } } }),
    prisma.viewsLog.count({ where: { profileUserId: userId, viewedAt: { gte: week } } }),
    prisma.profileComment.count({ where: { authorId: userId, createdAt: { gte: today }, profile: { userId: { not: userId } } } }),
    prisma.profileComment.findMany({ where: { authorId: userId, createdAt: { gte: week }, profile: { userId: { not: userId } } }, select: { profileId: true }, distinct: ["profileId"] }),
    prisma.profileLike.count({ where: { likerUserId: userId, createdAt: { gte: week } } }),
    prisma.referral.findFirst({ where: { referrerId: userId }, select: { id: true } }),
    prisma.questClaim.findMany({ where: { userId }, select: { questId: true, period: true } }),
  ]);
  const spunToday = !!user?.lastDailySpinAt && user.lastDailySpinAt >= today;
  const once = new Set(claims.filter((c) => c.period === "once").map((c) => c.questId));
  const raw: Record<string, number> = {
    daily_spin: spunToday ? 1 : 0,
    daily_visitors: visitorsToday,
    daily_comment: commentsToday,
    weekly_visitors: visitorsWeek,
    weekly_likes: likesWeek,
    weekly_comments: commentsWeek.length,
    once_discord: discord ? 1 : 0,
    once_links: linkCount,
    once_layout: profiles.some((p) => p.layoutTemplate && p.layoutTemplate !== "modern") ? 1 : 0,
    once_crew: crew ? 1 : 0,
    once_collectible: profiles.some((p) => p.activeNameplate || p.activeProfileEffect) ? 1 : 0,
    once_referral: referral ? 1 : 0,
    milestone_10: claims.length,
    milestone_once_all: ONE_TIME_IDS.filter((id) => once.has(id)).length,
  };
  const out: Record<string, number> = {};
  for (const q of QUESTS) out[q.id] = Math.min(q.goal, raw[q.id] ?? 0);
  return out;
}
