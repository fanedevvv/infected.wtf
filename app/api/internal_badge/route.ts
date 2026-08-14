import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseStringArray, serializeStringArray } from "@/lib/json-array";

function ok(message = "OK", extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: true, message, ...extra });
}
function err(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

const AUTO_ALLOWED = ["booster"];

/** True for badges the bot is allowed to grant/revoke automatically: the fixed "booster" badge, or any
 *  dynamic (Discord-role-backed) badge registered via register_discord_role. */
async function isAutoManageable(badgeId: string): Promise<boolean> {
  if (AUTO_ALLOWED.includes(badgeId)) return true;
  if (!badgeId.startsWith("dc_")) return false;
  const dyn = await prisma.dynamicBadge.findUnique({ where: { badgeKey: badgeId } });
  return !!dyn;
}

export async function POST(req: NextRequest) {
  const input = await req.json().catch(() => ({}));
  const expectedKey = process.env.DISCORD_BOT_API_KEY || "";
  const receivedKey = req.headers.get("x-api-key") || String(input.secret || "");
  if (!expectedKey || receivedKey !== expectedKey) return err("Unauthorized", 401);

  const action = String(input.action || "").trim();

  // ── Role <-> badge registry actions (no discord member involved) ──
  if (action === "register_discord_role") {
    const roleId = String(input.role_id || "").trim();
    const roleName = String(input.role_name || "").trim().slice(0, 80);
    const roleColor = input.role_color ? String(input.role_color).trim() : null;
    if (!/^\d{17,20}$/.test(roleId) || !roleName) return err("Invalid role_id/role_name.");
    const badgeKey = `dc_${roleId}`;
    await prisma.dynamicBadge.upsert({
      where: { badgeKey },
      update: { label: roleName, color: roleColor, discordRoleId: roleId },
      create: { badgeKey, label: roleName, color: roleColor, discordRoleId: roleId },
    });
    return ok(`Registered role '${roleName}' as badge '${badgeKey}'.`, { badge_key: badgeKey });
  }

  if (action === "unregister_discord_role") {
    const roleId = String(input.role_id || "").trim();
    if (!/^\d{17,20}$/.test(roleId)) return err("Invalid role_id.");
    const badgeKey = `dc_${roleId}`;
    await prisma.dynamicBadge.deleteMany({ where: { discordRoleId: roleId } });
    // Strip the badge from any profile that had it — the role no longer exists to represent it.
    const profiles = await prisma.profile.findMany({ where: { badges: { contains: badgeKey } }, select: { id: true, badges: true } });
    for (const p of profiles) {
      const owned = parseStringArray(p.badges).filter((b) => b !== badgeKey);
      await prisma.profile.update({ where: { id: p.id }, data: { badges: serializeStringArray(owned) } });
    }
    return ok(`Unregistered badge '${badgeKey}'.`);
  }

  // ── Member badge grant/revoke (existing behavior, generalized to dynamic badges) ──
  const badgeId = String(input.badge_id || "").trim();
  const discordId = String(input.discord_id || "").trim();

  if (!(await isAutoManageable(badgeId))) return err(`Badge '${badgeId}' not allowed for automatic management.`);
  if (!/^\d{17,20}$/.test(discordId)) return err("Invalid discord_id.");

  const integration = await prisma.integration.findFirst({ where: { type: "discord", discordUserId: discordId } });
  if (!integration) return ok(`No user linked with discord_id=${discordId} — skipped.`);
  const userId = integration.userId;

  async function badgeLabel(): Promise<string> {
    if (badgeId === "booster") return "Server Booster";
    const dyn = await prisma.dynamicBadge.findUnique({ where: { badgeKey: badgeId } });
    return dyn?.label || badgeId;
  }

  switch (action) {
    case "grant_badge": {
      const profile = await prisma.profile.findFirst({ where: { userId, isPrimary: true }, select: { badges: true } });
      const existing = parseStringArray(profile?.badges);
      const alreadyHas = existing.includes(badgeId);
      const owned = new Set(existing);
      owned.add(badgeId);
      await prisma.profile.updateMany({ where: { userId, isPrimary: true }, data: { badges: serializeStringArray(Array.from(owned)) } });
      if (!alreadyHas) {
        const label = await badgeLabel();
        await prisma.notification.create({
          data: { userId, type: "badge", title: `🚀 ${label} badge awarded!`, body: `You were granted the '${label}' role on Discord — the matching badge is now visible on your profile.`, icon: "star", link: "/dashboard?page=badges" },
        });
      }
      return ok(`Badge '${badgeId}' granted to user #${userId} (discord=${discordId}).`);
    }

    case "revoke_badge": {
      const profile = await prisma.profile.findFirst({ where: { userId, isPrimary: true }, select: { badges: true } });
      const owned = new Set(parseStringArray(profile?.badges));
      const hadIt = owned.has(badgeId);
      owned.delete(badgeId);
      await prisma.profile.updateMany({ where: { userId, isPrimary: true }, data: { badges: serializeStringArray(Array.from(owned)) } });
      if (hadIt) {
        const label = await badgeLabel();
        await prisma.notification.create({
          data: { userId, type: "badge", title: `${label} badge removed`, body: `The '${label}' role was removed on Discord — the badge has been automatically removed from your profile.`, icon: "bell", link: "/dashboard?page=badges" },
        });
      }
      return ok(`Badge '${badgeId}' revoked from user #${userId} (discord=${discordId}).`);
    }

    case "get_profile_slug": {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
      if (!user) return ok("No user linked — skipped.");
      return NextResponse.json({ success: true, slug: user.username });
    }

    case "list_badge_holders": {
      const profiles = await prisma.profile.findMany({ select: { userId: true, badges: true } });
      const userIds = profiles.filter((p) => parseStringArray(p.badges).includes(badgeId)).map((p) => p.userId);
      const integrations = await prisma.integration.findMany({ where: { type: "discord", userId: { in: userIds }, discordUserId: { not: null } }, select: { discordUserId: true } });
      return NextResponse.json({ success: true, discord_ids: integrations.map((i) => i.discordUserId) });
    }

    default:
      return err(`Unknown action '${action}'. Use 'grant_badge', 'revoke_badge', 'register_discord_role', 'unregister_discord_role' or 'list_badge_holders'.`);
  }
}
