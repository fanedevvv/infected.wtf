import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/active-profile";
import { SHOP_BADGES, SHOP_EFFECTS } from "@/lib/shop";
import ShopClient from "./ShopClient";
import { parseStringArray, parseNumberArray } from "@/lib/json-array";

export default async function ShopPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeProfileId = await getActiveProfileId(user.id);
  const profile = await prisma.profile.findUnique({ where: { id: activeProfileId } });
  if (!profile) redirect("/dashboard");

  const isPremium = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());
  const ownedBadges = parseStringArray(profile.badges);
  const purchasedEffects = parseStringArray(profile.purchasedEffects);
  const purchasedBundleIds = parseNumberArray(user.purchasedBundles);

  const settings = await prisma.siteSettings.findFirst();
  const x2Active = !!settings?.x2TokensEnabled;

  const bundles = await prisma.bundle.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <ShopClient
      username={user.username}
      userId={user.id}
      tokens={user.tokens}
      isPremium={isPremium}
      premiumExpiresAt={user.premiumExpiresAt ? user.premiumExpiresAt.toISOString() : null}
      ownedBadges={ownedBadges}
      purchasedEffects={purchasedEffects}
      x2Active={x2Active}
      bundles={bundles.map((b) => ({
        id: b.id,
        name: b.name,
        price: Number(b.price),
        priceType: b.priceType,
        badges: parseStringArray(b.badges),
        effects: parseStringArray(b.effects),
        premiumDays: b.premiumDays,
        owned: purchasedBundleIds.includes(b.id),
      }))}
      badgeCatalog={SHOP_BADGES}
      effectCatalog={SHOP_EFFECTS}
    />
  );
}
