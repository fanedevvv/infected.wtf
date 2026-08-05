import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import MarketplaceClient from "./MarketplaceClient";

export default async function MarketplacePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <MarketplaceClient tokens={user.tokens} username={user.username} />;
}
