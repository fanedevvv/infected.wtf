import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { getActiveProfileId } from "@/lib/active-profile";
import { SHOP_BADGES, SHOP_EFFECTS } from "@/lib/shop";
import { DECORATIONS, getCustomDecorationMeta, normalizeDecorationId } from "@/lib/decorations";
import { parseStringArray, serializeStringArray, parseNumberArray, serializeNumberArray, parseJsonObject } from "@/lib/json-array";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const activeProfileId = await getActiveProfileId(user.id);
  const profile = await prisma.profile.findUnique({ where: { id: activeProfileId } });
  const owned = new Set(parseStringArray(profile?.badges));
  const purchasedEffects = new Set(parseStringArray(profile?.purchasedEffects));
  const activeEffects = (parseJsonObject<Record<string, string>>(profile?.activeEffects) ?? {});
  const bundles = await prisma.bundle.findMany({ orderBy: { createdAt: "desc" } });
  const purchasedBundles = parseNumberArray(user.purchasedBundles);

  return NextResponse.json({
    tokens: user.tokens,
    badges: Object.entries(SHOP_BADGES).map(([id, b]) => ({ id, ...b, owned: owned.has(id) })),
    effects: Object.entries(SHOP_EFFECTS).map(([id, e]) => ({ id, ...e, owned: purchasedEffects.has(id) })),
    activeEffects,
    bundles: bundles.map((b) => ({
      id: b.id,
      name: b.name,
      price: Number(b.price),
      priceType: b.priceType,
      badges: parseStringArray(b.badges),
      effects: parseStringArray(b.effects),
      premiumDays: b.premiumDays,
      owned: purchasedBundles.includes(b.id),
    })),
  });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.banned) return NextResponse.json({ error: "Your account has been suspended." }, { status: 403 });

  const body = await req.json();
  const action = String(body.action || "");
  const activeProfileId = await getActiveProfileId(user.id);
  const profile = await prisma.profile.findUnique({ where: { id: activeProfileId } });
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const senderName = profile.displayName || user.username;

  // ── Buy badge ──────────────────────────────────────────
  if (action === "buy_badge" || action === "buy") {
    const id = String(body.badgeId || body.itemId || "");
    const item = SHOP_BADGES[id];
    if (!item) return NextResponse.json({ error: "Invalid item." }, { status: 400 });
    const owned = new Set(parseStringArray(profile.badges));
    if (owned.has(id)) return NextResponse.json({ error: "You already own this badge." }, { status: 400 });
    if (user.tokens < item.price) return NextResponse.json({ error: "Not enough tokens." }, { status: 400 });

    owned.add(id);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { tokens: { decrement: item.price }, tokensSpent: { increment: item.price } } }),
      prisma.profile.updateMany({ where: { id: activeProfileId }, data: { badges: serializeStringArray(Array.from(owned)) } }),
    ]);
    return NextResponse.json({ success: true, message: "Badge purchased successfully!", tokens: user.tokens - item.price, badge_id: id });
  }

  // ── Buy effect ─────────────────────────────────────────
  if (action === "buy_effect") {
    const id = String(body.effectId || "");
    const item = SHOP_EFFECTS[id];
    if (!item) return NextResponse.json({ error: "Invalid effect." }, { status: 400 });
    const owned = new Set(parseStringArray(profile.purchasedEffects));
    if (owned.has(id)) return NextResponse.json({ error: "Already owned." }, { status: 400 });
    if (user.tokens < item.price) return NextResponse.json({ error: "Not enough tokens." }, { status: 400 });

    owned.add(id);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { tokens: { decrement: item.price }, tokensSpent: { increment: item.price } } }),
      prisma.profile.updateMany({ where: { id: activeProfileId }, data: { purchasedEffects: serializeStringArray(Array.from(owned)) } }),
    ]);
    return NextResponse.json({ success: true, message: "Effect purchased!", tokens: user.tokens - item.price, effect_id: id });
  }

  // ── Equip / unequip a purchased effect ──────────────────
  if (action === "equip_effect") {
    const id = String(body.effectId || "");
    const slot = String(body.slot || "");
    if (!["cursor", "avatar", "bg", ""].includes(slot)) return NextResponse.json({ error: "Invalid slot." }, { status: 400 });
    const owned = new Set(parseStringArray(profile.purchasedEffects));
    if (id && !owned.has(id)) return NextResponse.json({ error: "You don't own this effect." }, { status: 400 });

    const active = { ...((parseJsonObject<Record<string, string>>(profile.activeEffects) ?? {})) };
    const effectSlot = id ? SHOP_EFFECTS[id]?.type : slot;
    if (!effectSlot) return NextResponse.json({ error: "Invalid effect." }, { status: 400 });

    const freeFieldReset: Record<string, unknown> = {};
    if (id) {
      active[effectSlot] = id;
      if (effectSlot === "bg") freeFieldReset.particleEffect = false;
      if (effectSlot === "cursor") freeFieldReset.cursorTrail = false;
      if (effectSlot === "avatar") freeFieldReset.avatarRing = "none";
    } else {
      delete active[effectSlot];
    }

    await prisma.profile.updateMany({ where: { id: activeProfileId }, data: { activeEffects: JSON.stringify(active), ...freeFieldReset } });
    return NextResponse.json({ success: true, activeEffects: active });
  }

  // ── Search users (for gifting) ──────────────────────────
  if (action === "search_users") {
    const q = String(body.q || "").trim();
    if (q.length < 2) return NextResponse.json({ success: true, users: [] });
    const users = await prisma.user.findMany({
      where: { username: { contains: q }, id: { not: user.id }, banned: false },
      select: { id: true, username: true, profiles: { where: { isPrimary: true }, take: 1, select: { avatar: true } } },
      orderBy: { username: "asc" },
      take: 8,
    });
    return NextResponse.json({
      success: true,
      users: users.map((u) => ({ id: u.id, username: u.username, avatar: u.profiles[0]?.avatar ? `/${u.profiles[0].avatar}` : "/assets/img/default-avatar.png" })),
    });
  }

  // ── Gift badge ───────────────────────────────────────────
  if (action === "gift" || action === "gift_badge") {
    const id = String(body.badgeId || body.itemId || "");
    const targetId = Number(body.targetId || 0);
    const item = SHOP_BADGES[id];
    if (!item) return NextResponse.json({ error: "Invalid item." }, { status: 400 });
    if (!targetId || targetId === user.id) return NextResponse.json({ error: "Invalid recipient." }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: targetId }, include: { profiles: { where: { isPrimary: true }, take: 1 } } });
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 400 });
    if (target.banned) return NextResponse.json({ error: "Cannot gift to a banned user." }, { status: 400 });

    const targetOwned = new Set(parseStringArray(target.profiles[0]?.badges));
    if (targetOwned.has(id)) return NextResponse.json({ error: `@${target.username} already owns the ${item.name} badge.` }, { status: 400 });
    if (user.tokens < item.price) return NextResponse.json({ error: "Not enough tokens." }, { status: 400 });

    targetOwned.add(id);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { tokens: { decrement: item.price }, tokensSpent: { increment: item.price } } }),
      prisma.profile.updateMany({ where: { userId: targetId , isPrimary: true }, data: { badges: serializeStringArray(Array.from(targetOwned)) } }),
      prisma.notification.create({
        data: { userId: targetId, type: "gift", title: "You received a gift! 🎁", body: `@${senderName} gifted you the ${item.name} badge.`, icon: "gift", link: "/dashboard?page=badges" },
      }),
    ]);
    return NextResponse.json({ success: true, message: `Badge gifted to @${target.username} successfully!`, tokens: user.tokens - item.price });
  }

  // ── Gift effect ──────────────────────────────────────────
  if (action === "gift_effect") {
    const id = String(body.effectId || "");
    const targetId = Number(body.targetId || 0);
    const item = SHOP_EFFECTS[id];
    if (!item) return NextResponse.json({ error: "Invalid effect." }, { status: 400 });
    if (!targetId || targetId === user.id) return NextResponse.json({ error: "Invalid recipient." }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: targetId }, include: { profiles: { where: { isPrimary: true }, take: 1 } } });
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 400 });
    if (target.banned) return NextResponse.json({ error: "Cannot gift to a banned user." }, { status: 400 });

    const targetOwned = new Set(parseStringArray(target.profiles[0]?.purchasedEffects));
    if (targetOwned.has(id)) return NextResponse.json({ error: `@${target.username} already owns the ${item.name} effect.` }, { status: 400 });
    if (user.tokens < item.price) return NextResponse.json({ error: "Not enough tokens." }, { status: 400 });

    targetOwned.add(id);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { tokens: { decrement: item.price }, tokensSpent: { increment: item.price } } }),
      prisma.profile.updateMany({ where: { userId: targetId , isPrimary: true }, data: { purchasedEffects: serializeStringArray(Array.from(targetOwned)) } }),
      prisma.notification.create({
        data: { userId: targetId, type: "gift", title: "You received a gift! 🎁", body: `@${senderName} gifted you the ${item.name} effect.`, icon: "gift", link: "/dashboard?page=effects" },
      }),
    ]);
    return NextResponse.json({ success: true, message: `Effect gifted to @${target.username} successfully!`, tokens: user.tokens - item.price });
  }

  // ── Activate Infected Plus with tokens (100/day) ──────────────
  if (action === "buy_premium_tokens") {
    const days = Math.max(1, parseInt(String(body.days || 30), 10));
    const cost = days * 100;
    if (user.tokens < cost) return NextResponse.json({ error: `Not enough tokens. You need ${cost} tokens for ${days} day(s). You have ${user.tokens}.` }, { status: 400 });

    const base = user.premiumExpiresAt && user.premiumExpiresAt > new Date() ? user.premiumExpiresAt : new Date();
    const newExpiry = new Date(base.getTime() + days * 86400 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: { tokens: { decrement: cost }, tokensSpent: { increment: cost }, isPremium: true, premiumExpiresAt: newExpiry },
    });
    return NextResponse.json({ success: true, message: `Infected Plus activated for ${days} day(s)!`, tokens: user.tokens - cost, days });
  }

  // ── Gift Infected Plus with tokens (Infected Plus-only sender) ──────
  if (action === "gift_premium_tokens") {
    const senderIsPremium = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());
    if (!senderIsPremium) return NextResponse.json({ error: "Gifting Infected Plus with tokens requires an active Infected Plus subscription." }, { status: 400 });

    const targetId = Number(body.targetId || 0);
    const days = Math.max(1, parseInt(String(body.days || 30), 10));
    const cost = days * 100;
    if (!targetId || targetId === user.id) return NextResponse.json({ error: "Invalid recipient." }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 400 });
    if (target.banned) return NextResponse.json({ error: "Cannot gift to a banned user." }, { status: 400 });
    if (user.tokens < cost) return NextResponse.json({ error: `Not enough tokens. You need ${cost} tokens for ${days} day(s). You have ${user.tokens}.` }, { status: 400 });

    const base = target.premiumExpiresAt && target.premiumExpiresAt > new Date() ? target.premiumExpiresAt : new Date();
    const newExpiry = new Date(base.getTime() + days * 86400 * 1000);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { tokens: { decrement: cost } } }),
      prisma.user.update({ where: { id: targetId }, data: { isPremium: true, premiumExpiresAt: newExpiry } }),
      prisma.notification.create({
        data: { userId: targetId, type: "gift", title: "You received Infected Plus! ⭐", body: `@${senderName} gifted you ${days} day(s) of Infected Plus.`, icon: "gift", link: "/dashboard?page=settings" },
      }),
    ]);
    return NextResponse.json({ success: true, message: `Infected Plus gifted to @${target.username} for ${days} day(s)!`, tokens: user.tokens - cost, days });
  }

  // ── Buy bundle (tokens only) ─────────────────────────────
  if (action === "buy_bundle") {
    const bundleId = Number(body.bundleId || 0);
    if (!bundleId) return NextResponse.json({ error: "Invalid bundle." }, { status: 400 });
    const bundle = await prisma.bundle.findUnique({ where: { id: bundleId } });
    if (!bundle) return NextResponse.json({ error: "Bundle not found." }, { status: 400 });
    if (bundle.priceType !== "tokens") return NextResponse.json({ error: "This bundle requires a payment — please contact support." }, { status: 400 });

    const owned = parseNumberArray(user.purchasedBundles);
    if (owned.includes(bundleId)) return NextResponse.json({ error: "You already own this bundle." }, { status: 400 });

    const price = Number(bundle.price);
    if (user.tokens < price) return NextResponse.json({ error: "Not enough tokens." }, { status: 400 });

    const badgeIds = parseStringArray(bundle.badges);
    const effectIds = parseStringArray(bundle.effects);
    const ownedBadges = new Set([...((parseStringArray(profile.badges))), ...badgeIds]);
    const ownedEffects = new Set([...((parseStringArray(profile.purchasedEffects))), ...effectIds]);

    const userUpdate: Record<string, unknown> = { tokens: { decrement: price }, tokensSpent: { increment: price }, purchasedBundles: serializeNumberArray([...owned, bundleId]) };
    if (bundle.premiumDays > 0) {
      const base = user.premiumExpiresAt && user.premiumExpiresAt > new Date() ? user.premiumExpiresAt : new Date();
      userUpdate.isPremium = true;
      userUpdate.premiumExpiresAt = new Date(base.getTime() + bundle.premiumDays * 86400 * 1000);
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: userUpdate }),
      prisma.profile.updateMany({ where: { id: activeProfileId }, data: { badges: serializeStringArray(Array.from(ownedBadges)), purchasedEffects: serializeStringArray(Array.from(ownedEffects)) } }),
    ]);
    return NextResponse.json({ success: true, message: `${bundle.name} unlocked!`, tokens: user.tokens - price });
  }

  // ── Gift bundle (tokens only) ────────────────────────────
  if (action === "gift_bundle") {
    const bundleId = Number(body.bundleId || 0);
    const targetId = Number(body.targetId || 0);
    if (!bundleId) return NextResponse.json({ error: "Invalid bundle." }, { status: 400 });
    if (!targetId || targetId === user.id) return NextResponse.json({ error: "Invalid recipient." }, { status: 400 });

    const bundle = await prisma.bundle.findUnique({ where: { id: bundleId } });
    if (!bundle) return NextResponse.json({ error: "Bundle not found." }, { status: 400 });
    if (bundle.priceType !== "tokens") return NextResponse.json({ error: "This bundle requires a payment — please contact support." }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: targetId }, include: { profiles: { where: { isPrimary: true }, take: 1 } } });
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 400 });
    if (target.banned) return NextResponse.json({ error: "Cannot gift to a banned user." }, { status: 400 });

    const targetOwned = parseNumberArray(target.purchasedBundles);
    if (targetOwned.includes(bundleId)) return NextResponse.json({ error: `@${target.username} already owns this bundle.` }, { status: 400 });

    const price = Number(bundle.price);
    if (user.tokens < price) return NextResponse.json({ error: "Not enough tokens." }, { status: 400 });

    const badgeIds = parseStringArray(bundle.badges);
    const effectIds = parseStringArray(bundle.effects);
    const ownedBadges = new Set([...((parseStringArray(target.profiles[0]?.badges))), ...badgeIds]);
    const ownedEffects = new Set([...((parseStringArray(target.profiles[0]?.purchasedEffects))), ...effectIds]);

    const targetUpdate: Record<string, unknown> = { purchasedBundles: serializeNumberArray([...targetOwned, bundleId]) };
    if (bundle.premiumDays > 0) {
      const base = target.premiumExpiresAt && target.premiumExpiresAt > new Date() ? target.premiumExpiresAt : new Date();
      targetUpdate.isPremium = true;
      targetUpdate.premiumExpiresAt = new Date(base.getTime() + bundle.premiumDays * 86400 * 1000);
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { tokens: { decrement: price }, tokensSpent: { increment: price } } }),
      prisma.user.update({ where: { id: targetId }, data: targetUpdate }),
      prisma.profile.updateMany({ where: { userId: targetId , isPrimary: true }, data: { badges: serializeStringArray(Array.from(ownedBadges)), purchasedEffects: serializeStringArray(Array.from(ownedEffects)) } }),
      prisma.notification.create({
        data: { userId: targetId, type: "gift", title: "You received a gift! 🎁", body: `@${senderName} gifted you the ${bundle.name} bundle.`, icon: "gift", link: "/dashboard?page=shop" },
      }),
    ]);
    return NextResponse.json({ success: true, message: `${bundle.name} gifted to @${target.username}!`, tokens: user.tokens - price });
  }

  // ── Buy decoration ───────────────────────────────────────
  if (action === "buy_decoration") {
    const id = normalizeDecorationId(String(body.decorationId || "").trim());
    const staticItem = DECORATIONS[id];
    const customItem = getCustomDecorationMeta(id);
    if (!staticItem && !customItem) return NextResponse.json({ error: "Invalid decoration." }, { status: 400 });

    const price = staticItem ? staticItem.price : customItem!.price;
    const rawOwned = parseStringArray(profile.decorationsOwned);
    const ownedNormalized = new Set(rawOwned.map((v) => normalizeDecorationId(v)));
    if (ownedNormalized.has(id)) return NextResponse.json({ error: "Already owned." }, { status: 400 });
    if (user.tokens < price) return NextResponse.json({ error: "Not enough tokens." }, { status: 400 });

    const owned = new Set(rawOwned);
    owned.add(id);

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { tokens: { decrement: price }, tokensSpent: { increment: price } } }),
      prisma.profile.updateMany({ where: { id: activeProfileId }, data: { decorationsOwned: serializeStringArray(Array.from(owned)) } }),
    ]);
    return NextResponse.json({ success: true, message: "Decoration purchased!", tokens: user.tokens - price, decoration_id: id });
  }

  // ── Equip / unequip a decoration ─────────────────────────
  if (action === "equip_decoration") {
    const id = normalizeDecorationId(String(body.decorationId || "").trim());
    const owned = new Set(((parseStringArray(profile.decorationsOwned))).map((v) => normalizeDecorationId(v)));
    if (id && !owned.has(id)) return NextResponse.json({ error: "You don't own this decoration." }, { status: 400 });

    await prisma.profile.updateMany({ where: { id: activeProfileId }, data: { activeDecoration: id || null } });
    return NextResponse.json({ success: true, activeDecoration: id || null });
  }

  // ── Transfer tokens to another user ──────────────────────
  if (action === "transfer_tokens") {
    const targetId = Number(body.targetId || 0);
    const amount = Math.max(0, Math.floor(Number(body.amount || 0)));
    if (!targetId || targetId === user.id) return NextResponse.json({ error: "Invalid recipient." }, { status: 400 });
    if (!amount || amount < 10) return NextResponse.json({ error: "Minimum transfer is 10 tokens." }, { status: 400 });
    if (user.tokens < amount) return NextResponse.json({ error: "Not enough tokens." }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 400 });
    if (target.banned) return NextResponse.json({ error: "Cannot send tokens to a banned user." }, { status: 400 });

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { tokens: { decrement: amount } } }),
      prisma.user.update({ where: { id: targetId }, data: { tokens: { increment: amount } } }),
      prisma.notification.create({
        data: { userId: targetId, type: "gift", title: "You received tokens! 💸", body: `@${senderName} sent you ${amount} tokens.`, icon: "gift", link: "/dashboard?page=premium" },
      }),
    ]);
    return NextResponse.json({ success: true, message: `Sent ${amount} tokens to @${target.username}!`, tokens: user.tokens - amount });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
