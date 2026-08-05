import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/active-profile";
import EffectsClient from "./EffectsClient";

export default async function EffectsPage({ section }: { section?: "full" | "bg" | "cursor" | "text" | "avatar" }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeProfileId = await getActiveProfileId(user.id);
  const profile = await prisma.profile.findUnique({ where: { id: activeProfileId } });
  if (!profile) redirect("/dashboard");

  const isPremium = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());
  const purchasedEffects = (profile.purchasedEffects as string[] | null) ?? [];
  const activeEffects = (profile.activeEffects as Record<string, string> | null) ?? {};

  return (
    <EffectsClient
      isPremium={isPremium}
      particleEffect={profile.particleEffect}
      cursorTrail={profile.cursorTrail}
      nameEffect={profile.nameEffect}
      bioEffect={profile.bioEffect}
      avatarRing={profile.avatarRing}
      avatarShape={profile.avatarShape}
      displayName={profile.displayName || user.username}
      bio={profile.bio || ""}
      purchasedEffects={purchasedEffects}
      activeEffects={activeEffects}
      section={section}
    />
  );
}
