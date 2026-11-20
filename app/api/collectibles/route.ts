import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { getActiveProfileId } from "@/lib/active-profile";
import { parseStringArray, serializeStringArray } from "@/lib/json-array";
import { ALL_COLLECTIBLES, canUse, getCollectible, isLimitedOpen, mintKey, type CollectibleKind } from "@/lib/collectibles";

const OWNED_FIELD = { nameplate: "nameplatesOwned", effect: "profileEffectsOwned" } as const;
const ACTIVE_FIELD = { nameplate: "activeNameplate", effect: "activeProfileEffect" } as const;
const isKind = (k: unknown): k is CollectibleKind => k === "nameplate" || k === "effect";
const isPremiumNow = (u: { isPremium: boolean | null; premiumExpiresAt: Date | null }) => !!u.isPremium && (!u.premiumExpiresAt || u.premiumExpiresAt > new Date());

async function state(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { tokens: true, isPremium: true, premiumExpiresAt: true } });
  const profileId = await getActiveProfileId(userId);
  const profile = await prisma.profile.findUnique({ where: { id: profileId }, select: { nameplatesOwned: true, activeNameplate: true, profileEffectsOwned: true, activeProfileEffect: true } });
  const owned = { nameplate: new Set(parseStringArray(profile?.nameplatesOwned)), effect: new Set(parseStringArray(profile?.profileEffectsOwned)) };
  const limitedKeys = ALL_COLLECTIBLES.filter((c) => c.limited).map(mintKey);
  const minted = await prisma.collectibleMint.groupBy({ by: ["itemKey"], where: { itemKey: { in: limitedKeys } }, _max: { serial: true } });
  const mine = await prisma.collectibleMint.findMany({ where: { userId, itemKey: { in: limitedKeys } }, select: { itemKey: true, serial: true } });
  const premium = user ? isPremiumNow(user) : false;
  return {
    tokens: user?.tokens ?? 0,
    premium,
    profileId,
    owned,
    active: { nameplate: profile?.activeNameplate ?? null, effect: profile?.activeProfileEffect ?? null },
    items: ALL_COLLECTIBLES.map((c) => {
      const key = mintKey(c);
      return {
        ...c,
        owned: owned[c.kind].has(c.id),
        usable: canUse(c, owned[c.kind], premium),
        minted: c.limited ? (minted.find((m) => m.itemKey === key)?._max.serial ?? 0) : undefined,
        open: c.limited ? isLimitedOpen(c) : undefined,
        serial: mine.find((m) => m.itemKey === key)?.serial,
      };
    }),
  };
}

export async function GET() {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }); }
  const s = await state(user.id);
  return NextResponse.json({ success: true, tokens: s.tokens, premium: s.premium, active: s.active, items: s.items });
}

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }); }
  if (user.banned) return NextResponse.json({ success: false, error: "Your account has been suspended." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const kind = body.kind;
  if (!isKind(kind)) return NextResponse.json({ success: false, error: "Unknown item type." }, { status: 400 });
  const s = await state(user.id);

  // ── Equip (or clear with id = null) ──
  if (body.action === "equip") {
    const id = body.id ? String(body.id) : null;
    if (id) {
      const item = getCollectible(kind, id);
      if (!canUse(item, s.owned[kind], s.premium)) {
        return NextResponse.json({ success: false, error: item?.source === "plus" ? "This one is for Infected Plus members." : "You don't own this yet." }, { status: 400 });
      }
    }
    await prisma.profile.update({ where: { id: s.profileId }, data: { [ACTIVE_FIELD[kind]]: id } });
    return NextResponse.json({ success: true, active: { ...s.active, [kind]: id } });
  }

  // ── Buy (shop items and limited drops) ──
  if (body.action === "buy") {
    const item = getCollectible(kind, String(body.id || ""));
    if (!item || !item.price || (item.source !== "shop" && item.source !== "limited")) return NextResponse.json({ success: false, error: "This item can't be bought." }, { status: 400 });
    if (s.owned[kind].has(item.id)) return NextResponse.json({ success: false, error: "You already own this." }, { status: 400 });
    if (s.tokens < item.price) return NextResponse.json({ success: false, error: "Not enough tokens." }, { status: 400 });

    const ownedNext = serializeStringArray([...s.owned[kind], item.id]);
    const charge = prisma.user.update({ where: { id: user.id }, data: { tokens: { decrement: item.price }, tokensSpent: { increment: item.price } } });
    const grant = prisma.profile.update({ where: { id: s.profileId }, data: { [OWNED_FIELD[kind]]: ownedNext } });

    if (!item.limited) {
      await prisma.$transaction([charge, grant]);
      return NextResponse.json({ success: true, message: `${item.name} is yours!`, tokens: s.tokens - item.price });
    }

    // Limited: take the next serial. The unique (item, serial) and (item, user) keys make concurrent buys safe —
    // a clash just retries with the next number; the supply check happens inside the same transaction.
    if (!isLimitedOpen(item)) return NextResponse.json({ success: false, error: "This drop has ended." }, { status: 400 });
    const key = mintKey(item);
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const serial = await prisma.$transaction(async (tx) => {
          // Supply counts serials ever issued (max), so a deleted account's copy is never re-sold.
          const top = await tx.collectibleMint.aggregate({ where: { itemKey: key }, _max: { serial: true } });
          const next = (top._max.serial ?? 0) + 1;
          if (next > item.limited!.supply) throw new Error("SOLD_OUT");
          const mint = await tx.collectibleMint.create({ data: { itemKey: key, serial: next, userId: user.id } });
          const fresh = await tx.user.findUnique({ where: { id: user.id }, select: { tokens: true } });
          if (!fresh || (fresh.tokens ?? 0) < item.price!) throw new Error("NO_TOKENS");
          await tx.user.update({ where: { id: user.id }, data: { tokens: { decrement: item.price! }, tokensSpent: { increment: item.price! } } });
          await tx.profile.update({ where: { id: s.profileId }, data: { [OWNED_FIELD[kind]]: ownedNext } });
          return mint.serial;
        });
        return NextResponse.json({ success: true, message: `${item.name} #${serial}/${item.limited.supply} is yours!`, tokens: s.tokens - item.price, serial });
      } catch (e) {
        if (e instanceof Error && e.message === "SOLD_OUT") return NextResponse.json({ success: false, error: "Sold out — every copy has been claimed." }, { status: 400 });
        if (e instanceof Error && e.message === "NO_TOKENS") return NextResponse.json({ success: false, error: "Not enough tokens." }, { status: 400 });
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          const already = await prisma.collectibleMint.findUnique({ where: { itemKey_userId: { itemKey: key, userId: user.id } } });
          if (already) return NextResponse.json({ success: false, error: "You already have a copy of this drop." }, { status: 400 });
          continue; // someone took that serial — try the next one
        }
        throw e;
      }
    }
    return NextResponse.json({ success: false, error: "Busy — please try again." }, { status: 409 });
  }

  return NextResponse.json({ success: false, error: "Unknown action." }, { status: 400 });
}
