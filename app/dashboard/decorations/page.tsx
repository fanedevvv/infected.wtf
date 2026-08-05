import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/active-profile";
import { DECORATIONS } from "@/lib/decorations";
import DecorationsClient from "./DecorationsClient";

export default async function DecorationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeProfileId = await getActiveProfileId(user.id);
  const profile = await prisma.profile.findUnique({ where: { id: activeProfileId } });
  if (!profile) redirect("/dashboard");

  const owned = (profile.decorationsOwned as string[] | null) ?? [];

  return (
    <DecorationsClient
      tokens={user.tokens}
      avatar={profile.avatar}
      catalog={Object.entries(DECORATIONS).map(([id, d]) => ({ id, ...d, owned: owned.includes(id) }))}
      activeDecoration={profile.activeDecoration}
    />
  );
}
