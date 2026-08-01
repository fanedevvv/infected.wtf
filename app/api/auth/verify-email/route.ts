import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const siteUrl = process.env.SITE_URL || "";

  if (!token) return NextResponse.redirect(`${siteUrl}/register?error=missing_token`);

  const record = await prisma.emailVerification.findUnique({ where: { token } });
  if (!record || record.used || record.expiresAt < new Date()) {
    return NextResponse.redirect(`${siteUrl}/register?error=invalid_token`);
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
    prisma.emailVerification.update({ where: { id: record.id }, data: { used: true, usedAt: new Date() } }),
  ]);

  // Award referral tokens now that the referred account is verified
  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (user?.referredBy) {
    const referrer = await prisma.user.findFirst({
      where: { OR: [{ referralCode: user.referredBy }, { username: user.referredBy }] },
    });
    if (referrer) {
      const already = await prisma.referral.findUnique({ where: { referredId: user.id } });
      if (!already) {
        await prisma.$transaction([
          prisma.referral.create({ data: { referrerId: referrer.id, referredId: user.id, tokensGiven: 10 } }),
          prisma.user.update({ where: { id: referrer.id }, data: { tokens: { increment: 10 } } }),
        ]);
      }
    }
  }

  return NextResponse.redirect(`${siteUrl}/login?verified=1`);
}
