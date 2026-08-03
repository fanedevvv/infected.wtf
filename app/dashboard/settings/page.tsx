import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TOTP } from "@/lib/totp";
import SettingsClient from "./SettingsClient";

const SITE_NAME = process.env.SITE_NAME || "INFECTED.WTF";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let canChangeUsername = true;
  let usernameNextChange: number | null = null;
  if (user.usernameChangedAt) {
    const secondsSince = Math.floor((Date.now() - user.usernameChangedAt.getTime()) / 1000);
    const secondsLeft = 7 * 86400 - secondsSince;
    if (secondsLeft > 0) {
      canChangeUsername = false;
      usernameNextChange = Math.min(7, Math.ceil(secondsLeft / 86400));
    }
  }

  const loginSessions = await prisma.loginHistory.findMany({
    where: { userId: user.id },
    orderBy: { loggedAt: "desc" },
    take: 10,
  });

  let twofaSecret = "";
  let twofaUri = "";
  if (!user.twoFaEnabled) {
    twofaSecret = TOTP.generateSecret();
    const totp = new TOTP(twofaSecret);
    twofaUri = totp.getQRUri(user.email, SITE_NAME);
  }

  return (
    <SettingsClient
      username={user.username}
      email={user.email}
      userId={user.id}
      canChangeUsername={canChangeUsername}
      usernameNextChange={usernameNextChange}
      twoFaEnabled={user.twoFaEnabled}
      twofaSecret={twofaSecret}
      twofaUri={twofaUri}
      regionCode={user.leaderboardRegionCode || ""}
      regionName={user.leaderboardRegionName || ""}
      loginSessions={loginSessions.map((s) => ({
        browser: s.browser,
        ipDisplay: s.ipDisplay,
        deviceType: s.deviceType,
        loggedAt: s.loggedAt.toISOString(),
      }))}
    />
  );
}
