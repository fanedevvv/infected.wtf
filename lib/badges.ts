import { prisma } from "./prisma";

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

export type Badge = { id: string; label: string };

/** Public-profile badge set: earned + role badges, hidden ones excluded, custom order applied. */
export async function getProfileBadges(userId: number): Promise<Badge[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, integrations: { where: { type: "discord" } } },
  });
  if (!user) return [];

  const manual = (user.profile?.badges as string[] | null) ?? [];
  const hidden = new Set((user.profile?.badgeHidden as string[] | null) ?? []);
  const order = (user.profile?.badgeOrder as string[] | null) ?? [];
  const manualSet = new Set(manual);

  const badges: Badge[] = [];
  if (manualSet.has("verified")) badges.push({ id: "verified", label: BADGE_LABELS.verified });

  const rankCount = await prisma.user.count({ where: { id: { lte: userId } } });
  if (rankCount <= 1000) badges.push({ id: "og", label: BADGE_LABELS.og });

  const top3 = await prisma.profile.findMany({ orderBy: { views: "desc" }, take: 3, select: { userId: true } });
  if (top3.some((p) => p.userId === userId)) badges.push({ id: "views_master", label: BADGE_LABELS.views_master });

  const views = user.profile?.views ?? 0;
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
