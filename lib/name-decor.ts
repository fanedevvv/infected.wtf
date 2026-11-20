import { prisma } from "./prisma";
import { canUse, getCollectible } from "./collectibles";
import { crewTagsFor, type CrewTag } from "./crews";
import { parseStringArray } from "./json-array";

export type NameDecor = { nameplate: string | null; crew: CrewTag | null };

/**
 * Nameplate + crew tag for many users at once (their primary page's active nameplate, only if they can use it).
 * A few queries in total, whatever the number of users — for lists like the leaderboard.
 */
export async function nameDecorFor(userIds: number[]): Promise<Map<number, NameDecor>> {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return new Map();
  const [profiles, users, crews] = await Promise.all([
    prisma.profile.findMany({ where: { userId: { in: ids }, isPrimary: true }, select: { userId: true, activeNameplate: true, nameplatesOwned: true } }),
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, isPremium: true, premiumExpiresAt: true } }),
    crewTagsFor(ids),
  ]);
  const premium = new Map(users.map((u) => [u.id, !!u.isPremium && (!u.premiumExpiresAt || u.premiumExpiresAt > new Date())]));
  const out = new Map<number, NameDecor>();
  for (const id of ids) {
    const p = profiles.find((x) => x.userId === id);
    const plate = getCollectible("nameplate", p?.activeNameplate);
    out.set(id, {
      nameplate: canUse(plate, new Set(parseStringArray(p?.nameplatesOwned)), premium.get(id) ?? false) ? plate!.id : null,
      crew: crews.get(id) ?? null,
    });
  }
  return out;
}
