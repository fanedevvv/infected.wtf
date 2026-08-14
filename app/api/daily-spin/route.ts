import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { getActiveProfileId } from "@/lib/active-profile";
import { SPIN_COOLDOWN_MS, rollSpinPrize } from "@/lib/spin";
import { parseStringArray, serializeStringArray } from "@/lib/json-array";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const nextAt = user.lastDailySpinAt ? user.lastDailySpinAt.getTime() + SPIN_COOLDOWN_MS : 0;
  const canSpin = Date.now() >= nextAt;
  return NextResponse.json({ canSpin, nextAt: canSpin ? null : nextAt, tokens: user.tokens });
}

export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.banned) return NextResponse.json({ error: "Your account has been suspended." }, { status: 403 });

  const nextAt = user.lastDailySpinAt ? user.lastDailySpinAt.getTime() + SPIN_COOLDOWN_MS : 0;
  if (Date.now() < nextAt) {
    return NextResponse.json({ error: "You've already spun today. Come back later!", nextAt }, { status: 400 });
  }

  const { prize, index } = rollSpinPrize();
  const activeProfileId = await getActiveProfileId(user.id);

  const userUpdate: Record<string, unknown> = { lastDailySpinAt: new Date() };
  if (prize.type === "tokens") {
    userUpdate.tokens = { increment: prize.amount };
  } else if (prize.type === "premium_days") {
    const base = user.premiumExpiresAt && user.premiumExpiresAt > new Date() ? user.premiumExpiresAt : new Date();
    userUpdate.isPremium = true;
    userUpdate.premiumExpiresAt = new Date(base.getTime() + prize.amount * 86400 * 1000);
  }

  const ops: Prisma.PrismaPromise<unknown>[] = [prisma.user.update({ where: { id: user.id }, data: userUpdate })];

  if (prize.type === "badge" && activeProfileId) {
    const profile = await prisma.profile.findUnique({ where: { id: activeProfileId } });
    const owned = new Set(parseStringArray(profile?.badges));
    if (!owned.has(prize.id)) {
      owned.add(prize.id);
      ops.push(prisma.profile.updateMany({ where: { id: activeProfileId }, data: { badges: serializeStringArray(Array.from(owned)) } }));
    }
  }

  await prisma.$transaction(ops);

  const updated = await prisma.user.findUnique({ where: { id: user.id } });
  return NextResponse.json({
    success: true,
    index,
    prize: { type: prize.type, label: prize.label, amount: "amount" in prize ? prize.amount : undefined },
    tokens: updated?.tokens ?? user.tokens,
    nextAt: Date.now() + SPIN_COOLDOWN_MS,
  });
}
