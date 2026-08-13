const DISCORD_API = "https://discord.com/api/v10";

export function getDiscordAuthorizeUrl(state: string): string {
  const redirectUri = `${process.env.SITE_URL}/api/integrations/discord/callback`;
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
  const redirectUri = `${process.env.SITE_URL}/api/integrations/discord/callback`;
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
