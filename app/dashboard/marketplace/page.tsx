import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getActiveProfile } from "@/lib/active-profile";
import MarketplaceClient from "./MarketplaceClient";

export default async function MarketplacePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getActiveProfile(user.id);

  return <MarketplaceClient tokens={user.tokens} username={user.username} profileSlug={profile.slug} />;
}
