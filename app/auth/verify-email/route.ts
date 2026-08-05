import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSessionCookie } from "@/lib/session";

export async function GET(req: NextRequest) {
  const siteUrl = process.env.SITE_URL || "";
  const token = req.nextUrl.searchParams.get("token") || "";

  let status: "invalid" | "expired" | "success" = "invalid";
  let userId: number | null = null;

  if (token) {
    const record = await prisma.emailVerification.findFirst({ where: { token, used: false } });
    if (!record) {
      status = "invalid";
    } else if (record.expiresAt < new Date()) {
      status = "expired";
    } else {
      await prisma.$transaction([
        prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
        prisma.emailVerification.delete({ where: { id: record.id } }),
      ]);
      status = "success";
      userId = record.userId;

      const user = await prisma.user.findUnique({ where: { id: record.userId } });
      if (user?.referredBy) {
        const referrer = await prisma.user.findFirst({
          where: { OR: [{ referralCode: user.referredBy }, { username: user.referredBy }] },
        });
        if (referrer && referrer.id !== user.id) {
          const already = await prisma.referral.findUnique({ where: { referredId: user.id } });
          if (!already) {
            const referrerIsPremium =
              referrer.isPremium && (!referrer.premiumExpiresAt || referrer.premiumExpiresAt.getTime() > Date.now());
            let refTokens = referrerIsPremium ? 20 : 10;
            const settings = await prisma.siteSettings.findFirst();
            if (settings?.x2TokensEnabled) refTokens *= 2;

            await prisma.$transaction([
              prisma.user.update({ where: { id: referrer.id }, data: { tokens: { increment: refTokens } } }),
              prisma.referral.create({ data: { referrerId: referrer.id, referredId: user.id, tokensGiven: refTokens } }),
            ]);

            const refCount = await prisma.referral.count({ where: { referrerId: referrer.id } });
            const referrerProfile = await prisma.profile.findFirst({ where: { userId: referrer.id , isPrimary: true } });
            let badges = (referrerProfile?.badges as string[] | null) ?? [];
            if (refCount >= 20) {
              badges = badges.filter((b) => b !== "promoter");
              if (!badges.includes("promoter_elite")) badges.push("promoter_elite");
              await prisma.profile.updateMany({ where: { userId: referrer.id , isPrimary: true }, data: { badges } });
            } else if (refCount >= 10) {
              if (!badges.includes("promoter") && !badges.includes("promoter_elite")) {
                badges.push("promoter");
                await prisma.profile.updateMany({ where: { userId: referrer.id , isPrimary: true }, data: { badges } });
              }
            }

            await prisma.notification.create({
              data: {
                userId: referrer.id,
                type: "referral",
                title: "New referral! 🎉",
                body: `Someone just signed up using your referral link. You earned ${refTokens} tokens!`,
                icon: "users",
                link: "/dashboard?page=referral",
              },
            });
          }
        }
      }
    }
  }

  const res = NextResponse.redirect(`${siteUrl}/auth/verify-email/result?status=${status}`);
  if (status === "success" && userId) {
    const cookie = buildSessionCookie(userId);
    res.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  return res;
}
