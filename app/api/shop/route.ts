import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { SHOP_BADGES, SHOP_EFFECTS } from "@/lib/shop";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  const owned = new Set((profile?.badges as string[] | null) ?? []);
  const purchasedEffects = new Set((profile?.purchasedEffects as string[] | null) ?? []);
  const activeEffects = (profile?.activeEffects as Record<string, string> | null) ?? {};

  return NextResponse.json({
    tokens: user.tokens,
    badges: Object.entries(SHOP_BADGES).map(([id, b]) => ({ id, ...b, owned: owned.has(id) })),
    effects: Object.entries(SHOP_EFFECTS).map(([id, e]) => ({ id, ...e, owned: purchasedEffects.has(id) })),
    activeEffects,
  });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const action = String(body.action || "");
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  if (action === "buy_badge") {
    const id = String(body.badgeId || "");
    const item = SHOP_BADGES[id];
    if (!item) return NextResponse.json({ error: "Invalid item." }, { status: 400 });
    const owned = new Set((profile.badges as string[] | null) ?? []);
    if (owned.has(id)) return NextResponse.json({ error: "You already own this." }, { status: 400 });
    if (user.tokens < item.price) return NextResponse.json({ error: "Not enough tokens." }, { status: 400 });

    owned.add(id);
    await prisma.$transaction([
      prisma.profile.update({ where: { userId: user.id }, data: { badges: Array.from(owned) } }),
      prisma.user.update({
        where: { id: user.id },
        data: { tokens: { decrement: item.price }, tokensSpent: { increment: item.price } },
      }),
    ]);
    return NextResponse.json({ success: true, message: `${item.name} unlocked!` });
  }

  if (action === "buy_effect") {
    const id = String(body.effectId || "");
    const item = SHOP_EFFECTS[id];
    if (!item) return NextResponse.json({ error: "Invalid item." }, { status: 400 });
    const owned = new Set((profile.purchasedEffects as string[] | null) ?? []);
    if (owned.has(id)) return NextResponse.json({ error: "You already own this." }, { status: 400 });
    if (user.tokens < item.price) return NextResponse.json({ error: "Not enough tokens." }, { status: 400 });

    owned.add(id);
    await prisma.$transaction([
      prisma.profile.update({ where: { userId: user.id }, data: { purchasedEffects: Array.from(owned) } }),
      prisma.user.update({
        where: { id: user.id },
        data: { tokens: { decrement: item.price }, tokensSpent: { increment: item.price } },
      }),
    ]);
    return NextResponse.json({ success: true, message: `${item.name} unlocked!` });
  }

  if (action === "equip_effect") {
    const id = String(body.effectId || "");
    const slot = String(body.slot || "");
    if (!["cursor", "avatar", "bg", ""].includes(slot)) return NextResponse.json({ error: "Invalid slot." }, { status: 400 });
    const owned = new Set((profile.purchasedEffects as string[] | null) ?? []);
    if (id && !owned.has(id)) return NextResponse.json({ error: "You don't own this effect." }, { status: 400 });

    const active = { ...((profile.activeEffects as Record<string, string> | null) ?? {}) };
    const effectSlot = id ? SHOP_EFFECTS[id]?.type : slot;
    if (!effectSlot) return NextResponse.json({ error: "Invalid effect." }, { status: 400 });
    if (id) active[effectSlot] = id;
    else delete active[effectSlot];

    await prisma.profile.update({ where: { userId: user.id }, data: { activeEffects: active } });
    return NextResponse.json({ success: true, activeEffects: active });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
