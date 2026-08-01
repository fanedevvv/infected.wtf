import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const referrals = await prisma.referral.findMany({
    where: { referrerId: user.id },
    include: { referred: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });

  const tokensEarned = referrals.reduce((sum, r) => sum + r.tokensGiven, 0);

  return NextResponse.json({
    referralCode: user.referralCode,
    count: referrals.length,
    tokensEarned,
    referrals: referrals.map((r) => ({ username: r.referred.username, createdAt: r.createdAt, tokens: r.tokensGiven })),
  });
}
