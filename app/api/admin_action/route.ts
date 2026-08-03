import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

function ok(message = "Done", extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: true, message, ...extra });
}
function err(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

const MANAGEABLE_BADGES = ["verified", "champion", "known", "rich", "trapstar", "the_killer", "crew", "billionaire", "content_creator", "designer"];

async function notifyDiscordAdminLog(
  event: "ban" | "unban" | "delete",
  actorId: number,
  actorUsername: string,
  actorGrade: string,
  targetUsername: string,
  targetId: number,
  targetGrade: string,
  extra = ""
) {
  const webhookUrl = process.env.DISCORD_ADMIN_LOG_WEBHOOK;
  if (!webhookUrl) return;
  const siteUrl = (process.env.SITE_URL || "https://infected.wtf").replace(/\/$/, "");

  const isBan = event === "ban";
  const isDelete = event === "delete";
  const isUnban = event === "unban";
  const color = isBan ? 16737792 : isDelete ? 16711680 : isUnban ? 5763719 : 8947848;
  const icon = isBan ? "🔨" : isDelete ? "🗑️" : isUnban ? "✅" : "⚙️";
  const title = isBan ? `${icon} User Banned` : isDelete ? `${icon} Account Deleted` : isUnban ? `${icon} User Unbanned` : `${icon} Admin Action`;

  const gradeLabels: Record<string, string> = { owner: "👑 Owner", admin: "🛡️ Admin", mod: "🔧 Moderator", user: "👤 User" };
  const actorGradeLabel = gradeLabels[actorGrade] || `👤 ${actorGrade}`;
  const targetGradeLabel = gradeLabels[targetGrade] || `👤 ${targetGrade}`;

  const fields: { name: string; value: string; inline: boolean }[] = [
    { name: "👤 Actor (performed by)", value: `\`@${actorUsername}\` (ID: \`${actorId}\`)\nRole: **${actorGradeLabel}**`, inline: false },
    { name: "🎯 Target (acted upon)", value: `\`@${targetUsername}\` (ID: \`${targetId}\`)\nRole: **${targetGradeLabel}**`, inline: false },
    { name: "⏰ When", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
  ];
  if (extra) fields.push({ name: "📋 Details", value: extra, inline: false });

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Infected · Admin Log",
        avatar_url: `${siteUrl}/assets/img/logo.png`,
        embeds: [{ title, color, fields, footer: { text: "Infected · Admin Log" }, timestamp: new Date().toISOString() }],
      }),
    });
  } catch {}
}

async function syncDiscordPremiumRole(userId: number, hasPremium: boolean) {
  const botUrl = process.env.DISCORD_BOT_URL;
  if (!botUrl) return;
  const apiKey = process.env.DISCORD_BOT_API_KEY || "";
  const integration = await prisma.integration.findFirst({ where: { userId, type: "discord" } });
  if (!integration?.discordUserId) return;
  const endpoint = hasPremium ? "/assign-premium-role" : "/remove-premium-role";
  try {
    await fetch(`${botUrl.replace(/\/$/, "")}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify({ discord_id: integration.discordUserId }),
      signal: AbortSignal.timeout(2000),
    });
  } catch {}
}

async function syncDiscordVerifiedRole(userId: number, grant: boolean) {
  const botUrl = process.env.DISCORD_BOT_URL;
  if (!botUrl) return;
  const apiKey = process.env.DISCORD_BOT_API_KEY || "";
  const integration = await prisma.integration.findFirst({ where: { userId, type: "discord" } });
  if (!integration?.discordUserId) return;
  const endpoint = grant ? "/assign-verified-role" : "/remove-verified-role";
  try {
    await fetch(`${botUrl.replace(/\/$/, "")}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify({ discord_id: integration.discordUserId }),
      signal: AbortSignal.timeout(2000),
    });
  } catch {}
}

async function getRateLimitCount(type: string, actorId: number): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  return prisma.rateLimit.count({ where: { type, ipHash: String(actorId), attemptedAt: { gte: since } } });
}
async function incrementRateLimit(type: string, actorId: number) {
  await prisma.rateLimit.create({ data: { type, ipHash: String(actorId) } });
}

function roleGrade(u: { isOwner: boolean; isAdmin: boolean; isMod: boolean }) {
  return u.isOwner ? "owner" : u.isAdmin ? "admin" : u.isMod ? "mod" : "user";
}

export async function POST(req: NextRequest) {
  const actor = await getCurrentUser();
  if (!actor) return err("Unauthenticated", 401);
  if (!actor.isAdmin && !actor.isOwner && !actor.isMod) return err("Forbidden", 403);

  const actorIsOwner = actor.isOwner;
  const actorIsAdmin = actor.isAdmin;
  const actorIsMod = !actor.isAdmin && !actor.isOwner && actor.isMod;

  let canGrantOwner = false;
  if (actorIsOwner) {
    const higherCount = await prisma.user.count({ where: { isOwner: true, id: { lt: actor.id } } });
    canGrantOwner = higherCount + 1 <= 3;
  }

  const input = await req.json().catch(() => ({}));
  const action = String(input.action || "");
  const targetId = Number(input.target_id || 0);

  // ── Actions that don't need a target user ──
  if (action === "toggle_whitelist") {
    if (!actorIsOwner) return err("Only owners can toggle the whitelist.", 403);
    let settings = await prisma.siteSettings.findFirst();
    settings = settings
      ? await prisma.siteSettings.update({ where: { id: settings.id }, data: { whitelistEnabled: !settings.whitelistEnabled, updatedBy: actor.id } })
      : await prisma.siteSettings.create({ data: { whitelistEnabled: true, updatedBy: actor.id } });
    return ok(`Whitelist ${settings.whitelistEnabled ? "enabled" : "disabled"}.`, { whitelist_enabled: settings.whitelistEnabled });
  }

  if (action === "toggle_x2_tokens") {
    if (!actorIsOwner) return err("Only owners can toggle the x2 Tokens event.", 403);
    let settings = await prisma.siteSettings.findFirst();
    settings = settings
      ? await prisma.siteSettings.update({ where: { id: settings.id }, data: { x2TokensEnabled: !settings.x2TokensEnabled, updatedBy: actor.id } })
      : await prisma.siteSettings.create({ data: { x2TokensEnabled: true, updatedBy: actor.id } });
    if (settings.x2TokensEnabled) {
      const activeUsers = await prisma.user.findMany({ where: { emailVerified: true, banned: false }, select: { id: true } });
      await prisma.notification.createMany({
        data: activeUsers.map((u) => ({
          userId: u.id,
          type: "event",
          title: "⚡ x2 Tokens Event is LIVE!",
          body: "Earn double tokens on every view, pack purchase and referral. Go grind!",
          icon: "star",
        })),
      });
    }
    return ok(`x2 Tokens event ${settings.x2TokensEnabled ? "ACTIVATED" : "deactivated"}!`, { x2_tokens_enabled: settings.x2TokensEnabled });
  }

  if (action === "create_bundle") {
    if (!actorIsOwner) return err("Only owners can create bundles.", 403);
    const name = String(input.name || "").trim();
    const price = Math.max(0, Number(input.price) || 0);
    const priceType = ["euro", "tokens"].includes(input.price_type) ? input.price_type : "euro";
    const badges = (Array.isArray(input.badges) ? input.badges : []).filter((v: unknown) => typeof v === "string" && v.length <= 60);
    const effects = (Array.isArray(input.effects) ? input.effects : []).filter((v: unknown) => typeof v === "string" && v.length <= 60);
    const premiumDays = Math.max(0, parseInt(input.premium_days) || 0);
    if (!name) return err("Bundle name is required.");
    if (name.length > 100) return err("Bundle name too long.");
    const bundle = await prisma.bundle.create({ data: { name, price, priceType, badges, effects, premiumDays, createdBy: actor.id } });
    return ok(`Bundle '${name}' created.`, { bundle_id: bundle.id });
  }

  if (action === "delete_bundle") {
    if (!actorIsOwner) return err("Only owners can delete bundles.", 403);
    const bundleId = Number(input.bundle_id || 0);
    if (!bundleId) return err("Invalid bundle ID.");
    await prisma.bundle.delete({ where: { id: bundleId } }).catch(() => {});
    return ok("Bundle deleted.");
  }

  if (action === "apply_bundle") {
    if (!actorIsOwner) return err("Only owners can apply bundles.", 403);
    const bundleId = Number(input.bundle_id || 0);
    const targetRaw = String(input.target || "").trim();
    if (!bundleId) return err("Invalid bundle ID.");
    if (!targetRaw) return err("Target user is required.");

    let applyTarget: { id: number; username: string } | null = null;
    if (targetRaw.startsWith("@")) {
      applyTarget = await prisma.user.findUnique({ where: { username: targetRaw.slice(1) }, select: { id: true, username: true } });
    } else if (targetRaw.startsWith("#")) {
      const uid = parseInt(targetRaw.slice(1));
      applyTarget = uid ? await prisma.user.findUnique({ where: { id: uid }, select: { id: true, username: true } }) : null;
    } else if (/^\d+$/.test(targetRaw)) {
      applyTarget = await prisma.user.findUnique({ where: { id: parseInt(targetRaw) }, select: { id: true, username: true } });
    } else {
      applyTarget = await prisma.user.findUnique({ where: { username: targetRaw }, select: { id: true, username: true } });
    }
    if (!applyTarget) return err("User not found.");
    const applyUserId = applyTarget.id;

    const bundle = await prisma.bundle.findUnique({ where: { id: bundleId } });
    if (!bundle) return err("Bundle not found.");

    const bundleBadges = (bundle.badges as string[] | null) ?? [];
    const bundleEffects = (bundle.effects as string[] | null) ?? [];
    const bundlePremium = bundle.premiumDays;
    const applied: string[] = [];

    if (bundleBadges.length > 0) {
      const profile = await prisma.profile.findUnique({ where: { userId: applyUserId }, select: { badges: true } });
      const owned = new Set((profile?.badges as string[] | null) ?? []);
      for (const b of bundleBadges) { owned.add(b); applied.push(`badge:${b}`); }
      await prisma.profile.update({ where: { userId: applyUserId }, data: { badges: Array.from(owned) } });
    }

    if (bundleEffects.length > 0) {
      const profile = await prisma.profile.findUnique({ where: { userId: applyUserId }, select: { purchasedEffects: true } });
      const owned = new Set((profile?.purchasedEffects as string[] | null) ?? []);
      for (const e of bundleEffects) { owned.add(e); applied.push(`effect:${e}`); }
      await prisma.profile.update({ where: { userId: applyUserId }, data: { purchasedEffects: Array.from(owned) } });
    }

    if (bundlePremium > 0) {
      const cur = await prisma.user.findUnique({ where: { id: applyUserId }, select: { isPremium: true, premiumExpiresAt: true } });
      const base = cur?.isPremium && cur.premiumExpiresAt ? cur.premiumExpiresAt.getTime() : Date.now();
      const until = new Date(base + bundlePremium * 86400000);
      await prisma.user.update({ where: { id: applyUserId }, data: { isPremium: true, premiumExpiresAt: until } });
      await syncDiscordPremiumRole(applyUserId, true);
      applied.push(`premium:${bundlePremium}d`);
    }

    await prisma.notification.create({
      data: {
        userId: applyUserId,
        type: "bundle",
        title: `🎁 You received a bundle: ${bundle.name}`,
        body: `An owner applied the '${bundle.name}' bundle to your account. Check your profile for new rewards!`,
        icon: "gift",
        link: "/dashboard/badges",
      },
    });

    return ok(`Bundle '${bundle.name}' applied to @${applyTarget.username}.`, { applied, user: applyTarget.username });
  }

  if (!targetId) return err("Invalid target");

  const selfEdit = !!input.self_edit;
  const selfAllowedActions = ["badge_grant", "badge_revoke", "set_tokens", "set_premium"];
  if (targetId === actor.id && !(actorIsOwner && selfEdit && selfAllowedActions.includes(action))) {
    return err("Cannot target yourself");
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return err("Target user not found", 404);

  if (targetId !== actor.id) {
    if (target.isOwner && !actorIsOwner) return err("You cannot target Owner accounts.", 403);
    if (target.isOwner && actorIsOwner && ["ban", "delete"].includes(action)) return err("Owners cannot ban or delete other Owner accounts.", 403);
    if (target.isAdmin && !actorIsOwner) return err("Admins cannot target other Admin accounts.", 403);
    if (actorIsMod && (target.isOwner || target.isAdmin || target.isMod)) return err("Moderators can only ban regular users.", 403);
  }

  const actorGrade = roleGrade(actor);
  const targetGrade = roleGrade(target);

  switch (action) {
    case "ban": {
      const days = parseInt(input.days) || 0;
      if (actorIsMod && days <= 0) return err("Moderators can only issue temporary bans.", 403);

      if (!actorIsOwner) {
        const banLimit = actorIsMod ? 3 : 7;
        const banCount = await getRateLimitCount("admin_ban", actor.id);
        if (banCount >= banLimit) return err(`Rate limit reached: you can only ban ${banLimit} user(s) per hour. Try again later.`, 429);
        await incrementRateLimit("admin_ban", actor.id);
      }
      notifyDiscordAdminLog("ban", actor.id, actor.username, actorGrade, target.username, targetId, targetGrade, days > 0 ? `Temporary (${days}d)` : "Permanent");

      if (days > 0) {
        const until = new Date(Date.now() + days * 86400000);
        await prisma.user.update({ where: { id: targetId }, data: { banned: true, banUntil: until } });
        return ok(`@${target.username} banned for ${days} day(s) (until ${until.toISOString().slice(0, 19).replace("T", " ")}).`);
      } else {
        await prisma.user.update({ where: { id: targetId }, data: { banned: true, banUntil: null } });
        return ok(`@${target.username} has been permanently banned.`);
      }
    }

    case "unban": {
      await prisma.user.update({ where: { id: targetId }, data: { banned: false, banUntil: null } });
      notifyDiscordAdminLog("unban", actor.id, actor.username, actorGrade, target.username, targetId, targetGrade);
      return ok(`@${target.username} has been unbanned.`);
    }

    case "delete": {
      if (!actorIsOwner) {
        const delCount = await getRateLimitCount("admin_delete", actor.id);
        if (delCount >= 5) return err("Rate limit reached: you can only delete 5 account(s) per hour. Try again later.", 429);
        await incrementRateLimit("admin_delete", actor.id);
      }
      notifyDiscordAdminLog("delete", actor.id, actor.username, actorGrade, target.username, targetId, targetGrade);
      await prisma.user.delete({ where: { id: targetId } });
      return ok(`@${target.username} has been deleted permanently.`);
    }

    case "badge_grant":
    case "badge_revoke": {
      if (!actorIsOwner) return err("Only owners can manage badges", 403);
      const badgeId = String(input.badge_id || "").trim();
      if (!MANAGEABLE_BADGES.includes(badgeId)) return err("Invalid badge ID");
      const grant = action === "badge_grant";
      const profile = await prisma.profile.findUnique({ where: { userId: targetId }, select: { badges: true } });
      const owned = new Set((profile?.badges as string[] | null) ?? []);
      if (grant) owned.add(badgeId); else owned.delete(badgeId);
      await prisma.profile.update({ where: { userId: targetId }, data: { badges: Array.from(owned) } });
      if (badgeId === "verified") await syncDiscordVerifiedRole(targetId, grant);
      if (grant) {
        await prisma.notification.create({
          data: { userId: targetId, type: "badge", title: "You received a new badge! 🏅", body: `The '${badgeId}' badge was granted to your profile by an admin.`, icon: "badge", link: "/dashboard/badges" },
        });
      }
      return ok(`Badge '${badgeId}' ${grant ? "granted to" : "revoked from"} @${target.username}.`);
    }

    case "set_tokens": {
      if (!actorIsOwner) return err("Only owners can set tokens", 403);
      const tokens = Math.max(0, parseInt(input.tokens) || 0);
      await prisma.user.update({ where: { id: targetId }, data: { tokens } });
      return ok(`@${target.username} tokens set to ${tokens}.`);
    }

    case "set_premium": {
      if (!actorIsOwner) return err("Only owners can manage Premium", 403);
      const days = parseInt(input.days) || 0;
      if (days > 0) {
        const until = new Date(Date.now() + days * 86400000);
        await prisma.user.update({ where: { id: targetId }, data: { isPremium: true, premiumExpiresAt: until } });
        await syncDiscordPremiumRole(targetId, true);
        return ok(`Premium granted to @${target.username} for ${days} day(s). Expires: ${until.toISOString().slice(0, 19).replace("T", " ")}.`, { premium: true, expires_at: until });
      } else {
        await prisma.user.update({ where: { id: targetId }, data: { isPremium: false, premiumExpiresAt: null } });
        await syncDiscordPremiumRole(targetId, false);
        return ok(`Premium revoked from @${target.username}.`, { premium: false });
      }
    }

    case "set_role": {
      if (!actorIsOwner) return err("Only owners can change roles", 403);
      const role = String(input.role || "").trim();
      if (!["user", "mod", "admin", "owner"].includes(role)) return err("Invalid role");
      if (role === "owner" && !canGrantOwner) return err("Only the first 3 owners can promote to Owner", 403);
      await prisma.user.update({
        where: { id: targetId },
        data: { isAdmin: role === "admin" || role === "owner", isOwner: role === "owner", isMod: role === "mod" },
      });
      return ok(`@${target.username} role set to ${role}.`);
    }

    default:
      return err("Unknown action");
  }
}
