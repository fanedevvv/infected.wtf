import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getDashboardBadgeState } from "@/lib/badges";
import { ALL_BADGES } from "@/lib/badge-defs";
import BadgesGrid from "./BadgesGrid";

export default async function BadgesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { earned, hidden, order, isPromoterElite } = await getDashboardBadgeState(user.id);
  const earnedSet = new Set(earned);

  const badges = { ...ALL_BADGES };
  if (isPromoterElite && badges.promoter) {
    badges.promoter = {
      ...badges.promoter,
      name: "Promoter Elite",
      desc: "Invited 20+ people — upgraded referral badge.",
      color: "#d1d5db",
    };
  }

  const unlockedMap = new Map<string, (typeof badges)[string]>();
  for (const bid of order) {
    if (badges[bid] && earnedSet.has(bid)) unlockedMap.set(bid, badges[bid]);
  }
  for (const [bid, b] of Object.entries(badges)) {
    if (earnedSet.has(bid) && !unlockedMap.has(bid)) unlockedMap.set(bid, b);
  }
  const lockedList: { bid: string; b: (typeof badges)[string] }[] = [];
  for (const [bid, b] of Object.entries(badges)) {
    if (!earnedSet.has(bid)) lockedList.push({ bid, b });
  }

  const cards = [
    ...Array.from(unlockedMap.entries()).map(([bid, b]) => ({
      cardId: bid === "promoter" && isPromoterElite ? "promoter_elite" : bid,
      realId: bid,
      name: b.name,
      desc: b.desc,
      color: b.color,
      unlocked: true,
      hidden: hidden.has(bid),
      elite: bid === "promoter" && isPromoterElite,
    })),
    ...lockedList.map(({ bid, b }) => ({
      cardId: bid,
      realId: bid,
      name: b.name,
      desc: b.desc,
      color: b.color,
      unlocked: false,
      hidden: false,
      elite: false,
    })),
  ];

  return <BadgesGrid cards={cards} totalCount={Object.keys(ALL_BADGES).length} earnedCount={earned.length} />;
}
