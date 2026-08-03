import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import EffectsClient from "./EffectsClient";

export default async function EffectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) redirect("/dashboard");

  const isPremium = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());
  const purchasedEffects = (profile.purchasedEffects as string[] | null) ?? [];
  const activeEffects = (profile.activeEffects as Record<string, string> | null) ?? {};

  return (
    <EffectsClient
      isPremium={isPremium}
      particleEffect={profile.particleEffect}
      cursorTrail={profile.cursorTrail}
      typingEffect={profile.typingEffect}
      avatarRing={profile.avatarRing}
      avatarShape={profile.avatarShape}
      displayName={profile.displayName || user.username}
      purchasedEffects={purchasedEffects}
      activeEffects={activeEffects}
    />
  );
}
