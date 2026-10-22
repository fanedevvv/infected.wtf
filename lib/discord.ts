import { parseStringArray, serializeStringArray } from "./json-array";

const DISCORD_API = "https://discord.com/api/v10";

// Must match a Redirect registered on the Discord application (OAuth2 → Redirects) character for character.
const DISCORD_REDIRECT_URI = () => `${process.env.SITE_URL}/integrations/discord/callback`;

export function getDiscordAuthorizeUrl(state: string): string {
  const redirectUri = DISCORD_REDIRECT_URI();
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeDiscordCode(code: string) {
  const redirectUri = DISCORD_REDIRECT_URI();
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Discord token exchange failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; token_type: string }>;
}

export async function getDiscordUser(accessToken: string) {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord user fetch failed: ${await res.text()}`);
  return res.json() as Promise<{
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
  }>;
}

/** Assign/remove a guild role using the bot token — requires DISCORD_GUILD_ID and a role id, and the bot must already be a member with Manage Roles. */
export async function setDiscordGuildRole(discordUserId: string, roleId: string, add: boolean) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken || !roleId) return;
  await fetch(`${DISCORD_API}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`, {
    method: add ? "PUT" : "DELETE",
    headers: { Authorization: `Bot ${botToken}` },
  }).catch(() => {});
}

export async function grantInfectedRole(discordUserId: string) {
  await setDiscordGuildRole(discordUserId, process.env.DISCORD_ROLE_INFECTED || "", true);
}

export async function revokeInfectedRole(discordUserId: string) {
  await setDiscordGuildRole(discordUserId, process.env.DISCORD_ROLE_INFECTED || "", false);
}

/** Syncs a site "grade" (profile badge) to its matching Discord role via the bot's internal API — mirrors grant/revoke onto the user's linked Discord account, if any. */
export async function syncDiscordBadgeRole(userId: number, badgeId: string, grant: boolean) {
  const botUrl = process.env.DISCORD_BOT_URL;
  if (!botUrl) return;
  const apiKey = process.env.DISCORD_BOT_API_KEY || "";
  const { prisma } = await import("./prisma");
  const integration = await prisma.integration.findFirst({ where: { userId, type: "discord" } });
  if (!integration?.discordUserId) return;

  let roleId: string | undefined;
  if (badgeId.startsWith("dc_")) {
    const dyn = await prisma.dynamicBadge.findUnique({ where: { badgeKey: badgeId } });
    if (!dyn?.discordRoleId) return;
    roleId = dyn.discordRoleId;
  }

  try {
    await fetch(`${botUrl.replace(/\/$/, "")}/badge-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify({ discord_id: integration.discordUserId, badge_id: badgeId, role_id: roleId, grant }),
      signal: AbortSignal.timeout(2000),
    });
  } catch {}
}

/** Creates a new Discord role for a badge created on the site, and registers the matching DynamicBadge row. Returns the created badge key, or null on failure. */
export async function createDynamicBadge(label: string, color: string): Promise<{ badgeKey: string; roleId: string } | null> {
  const botUrl = process.env.DISCORD_BOT_URL;
  const apiKey = process.env.DISCORD_BOT_API_KEY || "";
  if (!botUrl) return null;
  const { prisma } = await import("./prisma");
  try {
    const res = await fetch(`${botUrl.replace(/\/$/, "")}/create-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify({ name: label, color }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (!data?.success || !data.role_id) return null;
    const badgeKey = `dc_${data.role_id}`;
    await prisma.dynamicBadge.upsert({
      where: { badgeKey },
      update: { label, color, discordRoleId: data.role_id },
      create: { badgeKey, label, color, discordRoleId: data.role_id },
    });
    return { badgeKey, roleId: data.role_id };
  } catch {
    return null;
  }
}

/** Deletes a dynamic badge: removes the Discord role, the DynamicBadge row, and strips the badge from any profile that had it. */
export async function deleteDynamicBadge(badgeKey: string): Promise<boolean> {
  const { prisma } = await import("./prisma");
  const dyn = await prisma.dynamicBadge.findUnique({ where: { badgeKey } });
  if (!dyn) return false;

  const botUrl = process.env.DISCORD_BOT_URL;
  const apiKey = process.env.DISCORD_BOT_API_KEY || "";
  if (botUrl && dyn.discordRoleId) {
    try {
      await fetch(`${botUrl.replace(/\/$/, "")}/delete-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
        body: JSON.stringify({ role_id: dyn.discordRoleId }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {}
  }

  await prisma.dynamicBadge.delete({ where: { badgeKey } });
  const profiles = await prisma.profile.findMany({ where: { badges: { contains: badgeKey } }, select: { id: true, badges: true } });
  for (const p of profiles) {
    const owned = parseStringArray(p.badges).filter((b) => b !== badgeKey);
    await prisma.profile.update({ where: { id: p.id }, data: { badges: serializeStringArray(owned) } });
  }
  return true;
}
