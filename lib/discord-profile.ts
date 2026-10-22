// Full public Discord profile (badges, banner, decoration, server tag, nameplate) read with the bot token.
// Cached in memory: profile cards poll every 30s and Discord rate-limits /users/{id}.

const API = "https://discord.com/api/v10";
const CDN = "https://cdn.discordapp.com";
const CACHE_MS = 10 * 60 * 1000;

export type DiscordBadge = { key: string; label: string; icon: string };

export type DiscordProfile = {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string;
  bannerUrl: string | null;
  bannerColor: string | null;
  decorationUrl: string | null;
  nameplateUrl: string | null;
  guildTag: { tag: string; badgeUrl: string | null } | null;
  badges: DiscordBadge[];
  createdAt: string;
};

const badgeIcon = (hash: string) => `${CDN}/badge-icons/${hash}.png`;

// public_flags bit -> badge, in the order Discord shows them on a profile.
const FLAG_BADGES: { bit: number; key: string; label: string; hash: string }[] = [
  { bit: 1 << 0, key: "staff", label: "Discord Staff", hash: "5e74e9b61934fc1f67c65515d1f7e60d" },
  { bit: 1 << 1, key: "partner", label: "Partnered Server Owner", hash: "3f9748e53446a137a052f3454e2de41e" },
  { bit: 1 << 18, key: "certified_moderator", label: "Moderator Programs Alumni", hash: "fee1624003e2fee35cb398e125dc479b" },
  { bit: 1 << 2, key: "hypesquad", label: "HypeSquad Events", hash: "bf01d1073931f921909045f3a39fd264" },
  { bit: 1 << 6, key: "hypesquad_bravery", label: "HypeSquad Bravery", hash: "8a88d63823d8a71cd5e390baa45efa02" },
  { bit: 1 << 7, key: "hypesquad_brilliance", label: "HypeSquad Brilliance", hash: "011940fd013da3f7fb926e4a1cd2e618" },
  { bit: 1 << 8, key: "hypesquad_balance", label: "HypeSquad Balance", hash: "3aa41de486fa12454c3761e8e223442e" },
  { bit: 1 << 3, key: "bug_hunter_1", label: "Discord Bug Hunter", hash: "2717692c7dca7289b35297368a940dd0" },
  { bit: 1 << 14, key: "bug_hunter_2", label: "Discord Bug Hunter (Gold)", hash: "848f79194d4be5ff5f81505cbd0ce1e6" },
  { bit: 1 << 22, key: "active_developer", label: "Active Developer", hash: "6bdc42827a38498929a4920da12695d9" },
  { bit: 1 << 17, key: "verified_developer", label: "Early Verified Bot Developer", hash: "6df5892e0f35b051f8b61eace34f4967" },
  { bit: 1 << 9, key: "early_supporter", label: "Early Supporter", hash: "7060786766c9c840eb3019e725d2b358" },
];
const NITRO_BADGE = { key: "nitro", label: "Nitro Subscriber", icon: badgeIcon("2ba85e8026a8614b640c2837bcdfe21b") };

const cache = new Map<string, { at: number; data: DiscordProfile | null }>();

function cdnImage(kind: "avatars" | "banners", id: string, hash: string, size: number) {
  return `${CDN}/${kind}/${id}/${hash}.${hash.startsWith("a_") ? "gif" : "png"}?size=${size}`;
}

function snowflakeDate(id: string) {
  return new Date(Number(BigInt(id) >> BigInt(22)) + 1420070400000).toISOString();
}

type RawUser = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  banner: string | null;
  banner_color: string | null;
  accent_color: number | null;
  public_flags?: number;
  avatar_decoration_data?: { asset: string } | null;
  collectibles?: { nameplate?: { asset: string } | null } | null;
  primary_guild?: { identity_guild_id: string | null; identity_enabled: boolean | null; tag: string | null; badge: string | null } | null;
};

/** Profile for `id`; `premiumType` comes from our own OAuth data since bots can't see Nitro. */
export async function getDiscordProfile(id: string, premiumType = 0): Promise<DiscordProfile | null> {
  const hit = cache.get(id);
  let raw: RawUser | null = null;
  if (hit && Date.now() - hit.at < CACHE_MS) {
    if (!hit.data) return null;
    return withNitro(hit.data, premiumType);
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${API}/users/${id}`, { headers: { Authorization: `Bot ${token}` }, signal: AbortSignal.timeout(6000) });
    if (res.ok) raw = await res.json();
  } catch {}

  if (!raw) {
    // Keep serving a stale copy rather than blanking the card on a transient error.
    if (hit?.data) return withNitro(hit.data, premiumType);
    cache.set(id, { at: Date.now(), data: null });
    return null;
  }

  const flags = raw.public_flags ?? 0;
  const guild = raw.primary_guild;
  const data: DiscordProfile = {
    id: raw.id,
    username: raw.username,
    globalName: raw.global_name,
    avatarUrl: raw.avatar ? cdnImage("avatars", raw.id, raw.avatar, 160) : `${CDN}/embed/avatars/${Number(BigInt(raw.id) >> BigInt(22)) % 6}.png`,
    bannerUrl: raw.banner ? cdnImage("banners", raw.id, raw.banner, 600) : null,
    bannerColor: raw.banner_color || (raw.accent_color != null ? `#${raw.accent_color.toString(16).padStart(6, "0")}` : null),
    decorationUrl: raw.avatar_decoration_data?.asset ? `${CDN}/avatar-decoration-presets/${raw.avatar_decoration_data.asset}.png?size=160&passthrough=true` : null,
    nameplateUrl: raw.collectibles?.nameplate?.asset ? `${CDN}/assets/collectibles/${raw.collectibles.nameplate.asset}static.png` : null,
    guildTag: guild?.identity_enabled && guild.tag
      ? { tag: guild.tag, badgeUrl: guild.badge && guild.identity_guild_id ? `${CDN}/guild-tag-badges/${guild.identity_guild_id}/${guild.badge}.png?size=32` : null }
      : null,
    badges: FLAG_BADGES.filter((b) => flags & b.bit).map((b) => ({ key: b.key, label: b.label, icon: badgeIcon(b.hash) })),
    createdAt: snowflakeDate(raw.id),
  };
  cache.set(id, { at: Date.now(), data });
  return withNitro(data, premiumType);
}

function withNitro(p: DiscordProfile, premiumType: number): DiscordProfile {
  return premiumType > 0 ? { ...p, badges: [NITRO_BADGE, ...p.badges] } : p;
}

const appIconCache = new Map<string, string | null>();

/** Icon of a game/app from its application id, for activities that don't send their own artwork. */
export async function getAppIcon(applicationId: string): Promise<string | null> {
  if (appIconCache.has(applicationId)) return appIconCache.get(applicationId)!;
  let url: string | null = null;
  try {
    const res = await fetch(`${API}/applications/${applicationId}/rpc`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const app = (await res.json()) as { icon?: string | null };
      if (app.icon) url = `${CDN}/app-icons/${applicationId}/${app.icon}.png?size=128`;
    }
  } catch {}
  appIconCache.set(applicationId, url);
  return url;
}
