import { prisma } from "./prisma";
import { sha256 } from "./crypto";

function parseDevice(ua: string): string {
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod/i.test(ua)) return "mobile";
  return "desktop";
}

function parseBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  return "Unknown";
}

function parseOS(ua: string): string {
  if (/Windows NT 10/i.test(ua)) return "Windows 10/11";
  if (/Windows/i.test(ua)) return "Windows";
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown";
}

/** Records a unique daily profile view and awards view tokens; mirrors incrementViews() in helpers.php. */
export async function recordProfileView(profileUserId: number, ip: string, ua: string, countryCode: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const ipHash = sha256(ip + today.toISOString().slice(0, 10));

  try {
    await prisma.viewsLog.create({
      data: {
        profileUserId,
        ipHash,
        deviceType: parseDevice(ua),
        countryCode: countryCode || "XX",
        countryName: countryCode ? countryCode : "Unknown",
        browser: parseBrowser(ua),
        osName: parseOS(ua),
        viewedAt: today,
      },
    });
  } catch {
    return; // duplicate view today for this IP — unique constraint hit, nothing to do
  }

  const profile = await prisma.profile.update({
    where: { userId: profileUserId },
    data: { views: { increment: 1 } },
  });

  const user = await prisma.user.findUnique({ where: { id: profileUserId } });
  if (user?.leaderboardRegionCode && countryCode && user.leaderboardRegionCode.toUpperCase() === countryCode.toUpperCase()) {
    await prisma.profile.update({ where: { userId: profileUserId }, data: { localViews: { increment: 1 } } });
  }

  if (profile.views >= 1000) await grantBadge(profileUserId, "hall_of_fame", true);
  if (profile.views >= 10000) await grantBadge(profileUserId, "champion", true);

  const isPremium = user?.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());
  const tokens = isPremium ? 5 : 3;
  await prisma.user.update({ where: { id: profileUserId }, data: { tokens: { increment: tokens } } });
}

async function grantBadge(userId: number, badgeId: string, grant: boolean) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const current = new Set((profile?.badges as string[] | null) ?? []);
  if (grant) current.add(badgeId);
  else current.delete(badgeId);
  await prisma.profile.update({ where: { userId }, data: { badges: Array.from(current) } });
}
