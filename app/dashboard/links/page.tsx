import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/active-profile";
import DomainPicker from "./DomainPicker";

export default async function LinksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeProfileId = await getActiveProfileId(user.id);
  const profile = await prisma.profile.findUnique({ where: { id: activeProfileId }, select: { slug: true } });
  const isPremium = !!(user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date()));

  const [domains, selected] = await Promise.all([
    prisma.siteDomain.findMany({
      where: { status: "active" },
      orderBy: [{ isDefault: "desc" }, { tier: "asc" }, { hostname: "asc" }],
      select: { id: true, hostname: true, isDefault: true, tier: true },
    }),
    prisma.profileDomain.findMany({ where: { profileId: activeProfileId }, select: { domainId: true } }),
  ]);

  return (
    <DomainPicker
      slug={profile?.slug || ""}
      domains={domains}
      initialSelected={selected.map((s) => s.domainId)}
      max={3}
      isPremium={isPremium}
    />
  );
}
