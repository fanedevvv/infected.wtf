import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function ok(message = "OK", extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: true, message, ...extra });
}
function err(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

const AUTO_ALLOWED = ["booster"];

export async function POST(req: NextRequest) {
  const input = await req.json().catch(() => ({}));
  const expectedKey = process.env.DISCORD_BOT_API_KEY || "";
  const receivedKey = req.headers.get("x-api-key") || String(input.secret || "");
  if (!expectedKey || receivedKey !== expectedKey) return err("Unauthorized", 401);

  const action = String(input.action || "").trim();
  const badgeId = String(input.badge_id || "").trim();
  const discordId = String(input.discord_id || "").trim();

  if (!AUTO_ALLOWED.includes(badgeId)) return err(`Badge '${badgeId}' not allowed for automatic management.`);
  if (!/^\d{17,20}$/.test(discordId)) return err("Invalid discord_id.");

  const integration = await prisma.integration.findFirst({ where: { type: "discord", discordUserId: discordId } });
  if (!integration) return ok(`No user linked with discord_id=${discordId} — skipped.`);
  const userId = integration.userId;

  switch (action) {
    case "grant_badge": {
      const profile = await prisma.profile.findFirst({ where: { userId, isPrimary: true }, select: { badges: true } });
      const existing = (profile?.badges as string[] | null) ?? [];
      const alreadyHas = existing.includes(badgeId);
      const owned = new Set(existing);
      owned.add(badgeId);
      await prisma.profile.updateMany({ where: { userId, isPrimary: true }, data: { badges: Array.from(owned) } });
      if (!alreadyHas) {
        await prisma.notification.create({
          data: { userId, type: "badge", title: "🚀 Server Booster badge awarded!", body: "Thanks for boosting our Discord server! The Server Booster badge is now visible on your profile.", icon: "star", link: "/dashboard?page=badges" },
        });
      }
      return ok(`Badge '${badgeId}' granted to user #${userId} (discord=${discordId}).`);
    }

    case "revoke_badge": {
      const profile = await prisma.profile.findFirst({ where: { userId, isPrimary: true }, select: { badges: true } });
      const owned = new Set((profile?.badges as string[] | null) ?? []);
      owned.delete(badgeId);
      await prisma.profile.updateMany({ where: { userId, isPrimary: true }, data: { badges: Array.from(owned) } });
      await prisma.notification.create({
        data: { userId, type: "badge", title: "Server Booster badge elimined", body: "Your boost on our Discord server has expired. The badge has been automatically removed from your profile.", icon: "bell", link: "/dashboard?page=badges" },
      });
      return ok(`Badge '${badgeId}' revoked from user #${userId} (discord=${discordId}).`);
    }

    case "get_profile_slug": {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
      if (!user) return ok("No user linked — skipped.");
      return NextResponse.json({ success: true, slug: user.username });
    }

    case "list_badge_holders": {
      const profiles = await prisma.profile.findMany({ select: { userId: true, badges: true } });
      const userIds = profiles.filter((p) => ((p.badges as string[] | null) ?? []).includes(badgeId)).map((p) => p.userId);
      const integrations = await prisma.integration.findMany({ where: { type: "discord", userId: { in: userIds }, discordUserId: { not: null } }, select: { discordUserId: true } });
      return NextResponse.json({ success: true, discord_ids: integrations.map((i) => i.discordUserId) });
    }

    default:
      return err(`Unknown action '${action}'. Use 'grant_badge', 'revoke_badge' or 'list_badge_holders'.`);
  }
}
