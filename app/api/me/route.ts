import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getActiveProfileId, maxPagesFor } from "@/lib/active-profile";

function isPremiumNow(isPremium: boolean | null, premiumExpiresAt: Date | null): boolean {
  return !!isPremium && (!premiumExpiresAt || premiumExpiresAt.getTime() > Date.now());
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activeProfileId = await getActiveProfileId(user.id);
  const [profile, pages] = await Promise.all([
    prisma.profile.findUnique({ where: { id: activeProfileId } }),
    prisma.profile.findMany({
      where: { userId: user.id },
      orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
      select: { id: true, slug: true, displayName: true, avatar: true, isPrimary: true },
    }),
  ]);
  const { password: _password, twoFaSecret: _twoFaSecret, ...safeUser } = user;
  void _password;
  void _twoFaSecret;

  return NextResponse.json({
    user: safeUser,
    profile,
    pages,
    activeProfileId,
    maxPages: maxPagesFor(isPremiumNow(user.isPremium, user.premiumExpiresAt)),
  });
}
