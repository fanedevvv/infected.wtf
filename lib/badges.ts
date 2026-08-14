import { prisma } from "./prisma";
import { parseStringArray, serializeStringArray } from "./json-array";
import { syncDiscordBadgeRole } from "./discord";

const BADGE_LABELS: Record<string, string> = {
  verified: "Verified",
  og: "OG",
  views_master: "Views Master",
  hall_of_fame: "Hall of Fame",
  champion: "Champion",
  known: "Known",
  rich: "Rich",
  trapstar: "Trapstar",
  the_killer: "The Killer",
  lover: "Lover",
  fresh: "Fresh",
  crew: "Crew",
  billionaire: "Billionaire",
  content_creator: "Content Creator",
  designer: "Designer",
  promoter: "Promoter",
  promoter_elite: "Promoter Elite",
  owner: "Owner",
  admin: "Admin",
  premium: "Premium",
  discord: "Discord",
  booster: "Server Booster",
};

export type Badge = { id: string; label: string; color?: string };

/** Looks up display info for any dynamic (Discord-role-backed) badge ids present in the given set. */
async function loadDynamicBadges(ids: string[]): Promise<Badge[]> {
  const dynIds = ids.filter((id) => id.startsWith("dc_"));
  if (dynIds.length === 0) return [];
  const rows = await prisma.dynamicBadge.findMany({ where: { badgeKey: { in: dynIds } } });
  return rows.map((r) => ({ id: r.badgeKey, label: r.label, color: r.color ?? undefined }));
}

/** Public-profile badge set for a specific page (profile row): earned + role badges, hidden ones excluded, custom order applied. */
export async function getProfileBadges(profileId: number): Promise<Badge[]> {
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) return [];
  const userId = profile.userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { integrations: { where: { type: "discord" } } },
  });
  if (!user) return [];

  const manual = parseStringArray(profile.badges);
  const hidden = new Set(parseStringArray(profile.badgeHidden));
  const order = parseStringArray(profile.badgeOrder);
  const manualSet = new Set(manual);

  const badges: Badge[] = [];
  if (manualSet.has("verified")) badges.push({ id: "verified", label: BADGE_LABELS.verified });

  const rankCount = await prisma.user.count({ where: { id: { lte: userId } } });
  if (rankCount <= 1000) badges.push({ id: "og", label: BADGE_LABELS.og });

  const top3 = await prisma.profile.findMany({ orderBy: { views: "desc" }, take: 3, select: { id: true } });
  if (top3.some((p) => p.id === profileId)) badges.push({ id: "views_master", label: BADGE_LABELS.views_master });

  const views = profile.views ?? 0;
  if (views >= 1000) badges.push({ id: "hall_of_fame", label: BADGE_LABELS.hall_of_fame });
  if (views >= 10000 || manualSet.has("champion")) badges.push({ id: "champion", label: BADGE_LABELS.champion });

  for (const id of ["known", "rich", "trapstar", "the_killer", "lover", "fresh"]) {
    if (manualSet.has(id)) badges.push({ id, label: BADGE_LABELS[id] });
  }
  for (const id of ["crew", "billionaire", "content_creator", "designer"]) {
    if (manualSet.has(id)) badges.push({ id, label: BADGE_LABELS[id] });
  }

  const refCount = await prisma.referral.count({ where: { referrerId: userId } });
  if (refCount >= 20) badges.push({ id: "promoter_elite", label: BADGE_LABELS.promoter_elite });
  else if (refCount >= 10) badges.push({ id: "promoter", label: BADGE_LABELS.promoter });

  if (user.isOwner) badges.push({ id: "owner", label: BADGE_LABELS.owner });
  if (user.isAdmin) badges.push({ id: "admin", label: BADGE_LABELS.admin });

  const isPremium = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());
  if (isPremium) badges.push({ id: "premium", label: BADGE_LABELS.premium });

  if (user.integrations.length > 0) badges.push({ id: "discord", label: BADGE_LABELS.discord });
  if (manualSet.has("booster")) badges.push({ id: "booster", label: BADGE_LABELS.booster });

  badges.push(...(await loadDynamicBadges(manual)));

  const visible = badges.filter((b) => !hidden.has(b.id));

  if (order.length > 0) {
    const ordered: Badge[] = [];
    for (const id of order) {
      const b = visible.find((x) => x.id === id);
      if (b) ordered.push(b);
    }
    for (const b of visible) if (!order.includes(b.id)) ordered.push(b);
    return ordered;
  }

  return visible;
}

export type DashboardBadgeState = {
  earned: string[];
  hidden: Set<string>;
  order: string[];
  isPromoterElite: boolean;
};

/** Dashboard badge state: all earned badge ids (unfiltered), hidden set, custom order, and promoter/elite sync — mirrors badges.php. */
export async function getDashboardBadgeState(userId: number): Promise<DashboardBadgeState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profiles: { where: { isPrimary: true }, take: 1 }, integrations: { where: { type: "discord" } } },
  });
  const profile = user?.profiles[0];
  if (!user || !profile) return { earned: [], hidden: new Set(), order: [], isPromoterElite: false };

  const manual = parseStringArray(profile.badges);
  const hidden = new Set(parseStringArray(profile.badgeHidden));
  const order = parseStringArray(profile.badgeOrder);
  const manualSet = new Set(manual);

  const earned: string[] = [];
  if (manualSet.has("verified")) earned.push("verified");

  const rankCount = await prisma.user.count({ where: { id: { lte: userId } } });
  const isOg = rankCount <= 1000;
  if (isOg) earned.push("og");
  if (isOg) await syncDiscordBadgeRole(userId, "og", true);

  const top3 = await prisma.profile.findMany({ orderBy: { views: "desc" }, take: 3, select: { userId: true } });
  const isViewsMaster = top3.some((p) => p.userId === userId);
  if (isViewsMaster) earned.push("views_master");
  await syncDiscordBadgeRole(userId, "views_master", isViewsMaster);

  const views = profile.views ?? 0;
  if (views >= 1000) earned.push("hall_of_fame");
  if (views >= 10000 || manualSet.has("champion")) earned.push("champion");

  for (const id of ["known", "rich", "trapstar", "the_killer", "lover", "fresh", "crew", "billionaire", "content_creator", "designer"]) {
    if (manualSet.has(id)) earned.push(id);
  }

  const isPremiumUser = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt.getTime() > Date.now());
  if (isPremiumUser) earned.push("premium");
  if (user.isOwner) earned.push("owner");
  if (user.isAdmin) earned.push("admin");
  if (user.integrations.length > 0) earned.push("discord");
  if (manualSet.has("booster")) earned.push("booster");

  for (const b of await loadDynamicBadges(manual)) earned.push(b.id);

  const refCount = await prisma.referral.count({ where: { referrerId: userId } });
  let isPromoterElite = false;
  let badgesJson = manual;

  if (refCount >= 20) {
    isPromoterElite = true;
    earned.push("promoter");
    if (!badgesJson.includes("promoter_elite")) {
      badgesJson = [...badgesJson.filter((b) => b !== "promoter"), "promoter_elite"];
      await prisma.profile.updateMany({ where: { userId, isPrimary: true }, data: { badges: serializeStringArray(badgesJson) } });
      await syncDiscordBadgeRole(userId, "promoter", false);
      await syncDiscordBadgeRole(userId, "promoter_elite", true);
    }
  } else if (refCount >= 10) {
    earned.push("promoter");
    if (!badgesJson.includes("promoter")) {
      badgesJson = [...badgesJson, "promoter"];
      await prisma.profile.updateMany({ where: { userId, isPrimary: true }, data: { badges: serializeStringArray(badgesJson) } });
      await syncDiscordBadgeRole(userId, "promoter", true);
    }
  }

  return { earned, hidden, order, isPromoterElite };
}
