import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import PremiumClient from "./PremiumClient";

export default async function PremiumPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isPremium = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());

  return (
    <PremiumClient
      tokens={user.tokens}
      isPremium={isPremium}
      premiumExpiresAt={user.premiumExpiresAt ? user.premiumExpiresAt.toISOString() : null}
    />
  );
}
