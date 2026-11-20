import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { getActiveProfileId } from "@/lib/active-profile";
import { parseStringArray, serializeStringArray } from "@/lib/json-array";
import { QUESTS, periodKey, questProgress } from "@/lib/quests";
import { getCollectible } from "@/lib/collectibles";

export async function GET() {
  let me;
  try { me = await requireUser(); } catch { return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }); }
  const [progress, claims] = await Promise.all([
    questProgress(me.id),
    prisma.questClaim.findMany({ where: { userId: me.id }, select: { questId: true, period: true } }),
  ]);
  const claimed = new Set(claims.map((c) => `${c.questId}|${c.period}`));
  return NextResponse.json({
    success: true,
    quests: QUESTS.map((q) => {
      const r = q.reward;
      const item = r.nameplate ? getCollectible("nameplate", r.nameplate) : r.effect ? getCollectible("effect", r.effect) : null;
      return {
        ...q, progress: progress[q.id] ?? 0, claimed: claimed.has(`${q.id}|${periodKey(q.period)}`),
        rewardLabel: r.tokens ? `${r.tokens} tokens` : item ? `${item.name} ${item.kind === "nameplate" ? "nameplate" : "profile effect"}` : "",
      };
    }),
    completed: claims.length,
  });
}

export async function POST(req: NextRequest) {
  let me;
  try { me = await requireUser(); } catch { return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }); }
  if (me.banned) return NextResponse.json({ success: false, error: "Your account has been suspended." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const quest = QUESTS.find((q) => q.id === String(body.questId || ""));
  if (!quest) return NextResponse.json({ success: false, error: "Unknown quest." }, { status: 400 });
  const progress = (await questProgress(me.id))[quest.id] ?? 0;
  if (progress < quest.goal) return NextResponse.json({ success: false, error: "Not finished yet." }, { status: 400 });

  const period = periodKey(quest.period);
  const r = quest.reward;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.questClaim.create({ data: { userId: me.id, questId: quest.id, period } });
      if (r.tokens) await tx.user.update({ where: { id: me.id }, data: { tokens: { increment: r.tokens } } });
      if (r.nameplate || r.effect) {
        const profileId = await getActiveProfileId(me.id);
        const field = r.nameplate ? "nameplatesOwned" : "profileEffectsOwned";
        const profile = await tx.profile.findUnique({ where: { id: profileId }, select: { nameplatesOwned: true, profileEffectsOwned: true } });
        const owned = new Set(parseStringArray(profile?.[field]));
        owned.add((r.nameplate || r.effect)!);
        await tx.profile.update({ where: { id: profileId }, data: { [field]: serializeStringArray([...owned]) } });
      }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return NextResponse.json({ success: false, error: "Already claimed." }, { status: 400 });
    throw e;
  }
  const item = r.nameplate ? getCollectible("nameplate", r.nameplate) : r.effect ? getCollectible("effect", r.effect) : null;
  return NextResponse.json({ success: true, message: r.tokens ? `+${r.tokens} tokens!` : `${item?.name} unlocked — equip it in Collectibles!` });
}
