import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/active-profile";
import CollectiblesClient from "./CollectiblesClient";

export default async function CollectiblesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await prisma.profile.findUnique({ where: { id: await getActiveProfileId(user.id) }, select: { displayName: true, slug: true, avatar: true, banner: true } });
  return <CollectiblesClient displayName={profile?.displayName || user.username} username={profile?.slug || user.username} avatar={profile?.avatar ?? null} banner={profile?.banner ?? null} />;
}
