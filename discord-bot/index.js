require('dotenv').config();

const express = require('express');
const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
} = require('discord.js');

const {
  DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID,
  DISCORD_ROLE_INFECTED,
  DISCORD_ROLE_PREMIUM,
  DISCORD_ROLE_VERIFIED,
  DISCORD_LOG_CHANNEL_ID,
  API_KEY,
  SITE_URL,
  PORT,
} = process.env;

// badge id (as used in profiles.badges on the site) -> Discord role id, read from env.
// Populated by scripts/create-badge-roles.js.
const BADGE_ROLE_MAP = {
  verified: DISCORD_ROLE_VERIFIED,
  champion: process.env.DISCORD_ROLE_CHAMPION,
  hall_of_fame: process.env.DISCORD_ROLE_HALL_OF_FAME,
  fresh: process.env.DISCORD_ROLE_FRESH,
  lover: process.env.DISCORD_ROLE_LOVER,
  known: process.env.DISCORD_ROLE_KNOWN,
  rich: process.env.DISCORD_ROLE_RICH,
  trapstar: process.env.DISCORD_ROLE_TRAPSTAR,
  the_killer: process.env.DISCORD_ROLE_THE_KILLER,
  crew: process.env.DISCORD_ROLE_CREW,
  billionaire: process.env.DISCORD_ROLE_BILLIONAIRE,
  content_creator: process.env.DISCORD_ROLE_CONTENT_CREATOR,
  designer: process.env.DISCORD_ROLE_DESIGNER,
  owner: process.env.DISCORD_ROLE_OWNER,
  admin: process.env.DISCORD_ROLE_ADMIN,
  discord: process.env.DISCORD_ROLE_DISCORD,
  og: process.env.DISCORD_ROLE_OG,
  views_master: process.env.DISCORD_ROLE_VIEWS_MASTER,
  promoter: process.env.DISCORD_ROLE_PROMOTER,
  promoter_elite: process.env.DISCORD_ROLE_PROMOTER_ELITE,
};

// Role ids that already map to a hardcoded site badge — new-role/member-role sync should ignore these,
// they're managed exclusively through the site's own grant/revoke + BADGE_ROLE_MAP flow.
const KNOWN_ROLE_IDS = new Set([DISCORD_ROLE_INFECTED, DISCORD_ROLE_PREMIUM, ...Object.values(BADGE_ROLE_MAP)].filter(Boolean));

async function callSite(action, body) {
  if (!SITE_URL) return null;
  try {
    const res = await fetch(`${SITE_URL.replace(/\/$/, '')}/api/internal_badge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
      body: JSON.stringify({ action, ...body }),
      signal: AbortSignal.timeout(4000),
    });
    return await res.json().catch(() => null);
  } catch (e) {
    console.error(`[bot] callSite(${action}) failed:`, e.message);
    return null;
  }
}

for (const [name, val] of Object.entries({ DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, API_KEY })) {
  if (!val) {
    console.error(`[fatal] Missing required env var ${name}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

// ── Discord client ──────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,     // privileged — enable "Server Members Intent" in the Dev Portal
    GatewayIntentBits.GuildPresences,   // privileged — enable "Presence Intent" in the Dev Portal
    GatewayIntentBits.GuildModeration,  // guildBanAdd / guildBanRemove
  ],
  partials: [Partials.GuildMember, Partials.User],
});

client.once('ready', () => {
  console.log(`[bot] Logged in as ${client.user.tag}`);
});

client.login(DISCORD_BOT_TOKEN);

async function getGuild() {
  return client.guilds.fetch(DISCORD_GUILD_ID);
}

async function logToChannel(text) {
  if (!DISCORD_LOG_CHANNEL_ID) return;
  try {
    const channel = await client.channels.fetch(DISCORD_LOG_CHANNEL_ID);
    if (channel?.isTextBased()) await channel.send(text);
  } catch (e) {
    console.error('[bot] logToChannel failed:', e.message);
  }
}

// Discord → site ban sync goes through the site's internal API, so the bot needs no database access
// (it can run in its own container on the panel).
async function setSiteBanStateByDiscordId(discordId, banned) {
  const result = await callSite('set_ban_by_discord', { discord_id: discordId, banned });
  if (!result?.success) throw new Error(result?.error || 'site unreachable');
  return result.user_id || null;
}

// Discord → site: someone gets banned/unbanned directly on the server
client.on('guildBanAdd', async (ban) => {
  try {
    const userId = await setSiteBanStateByDiscordId(ban.user.id, true);
    if (userId) {
      console.log(`[bot] Synced Discord ban → site ban for user #${userId} (discord ${ban.user.id})`);
      logToChannel(`🔨 **${ban.user.tag}** was banned on Discord — synced to their linked site account.`);
    }
  } catch (e) {
    console.error('[bot] guildBanAdd sync failed:', e.message);
  }
});

client.on('guildBanRemove', async (ban) => {
  try {
    const userId = await setSiteBanStateByDiscordId(ban.user.id, false);
    if (userId) {
      console.log(`[bot] Synced Discord unban → site unban for user #${userId} (discord ${ban.user.id})`);
      logToChannel(`✅ **${ban.user.tag}** was unbanned on Discord — synced to their linked site account.`);
    }
  } catch (e) {
    console.error('[bot] guildBanRemove sync failed:', e.message);
  }
});

// ── Dynamic grade sync: Discord role <-> site badge ─────────────────────────
// A role created on Discord (that isn't one of our hardcoded BADGE_ROLE_MAP roles) becomes
// a badge on the site automatically; deleting the role removes the badge. Members gaining or
// losing such a role get the matching badge granted/revoked on their linked site account.
function dynamicBadgeKey(roleId) {
  return `dc_${roleId}`;
}

client.on('roleCreate', async (role) => {
  try {
    if (role.managed || role.id === role.guild.id || KNOWN_ROLE_IDS.has(role.id)) return;
    const hex = typeof role.hexColor === 'string' && role.hexColor !== '#000000' ? role.hexColor : null;
    const result = await callSite('register_discord_role', { role_id: role.id, role_name: role.name, role_color: hex });
    if (result?.success) console.log(`[bot] Registered new role "${role.name}" as site badge ${dynamicBadgeKey(role.id)}`);
  } catch (e) {
    console.error('[bot] roleCreate sync failed:', e.message);
  }
});

client.on('roleDelete', async (role) => {
  try {
    if (KNOWN_ROLE_IDS.has(role.id)) return;
    await callSite('unregister_discord_role', { role_id: role.id });
    console.log(`[bot] Unregistered site badge for deleted role "${role.name}"`);
  } catch (e) {
    console.error('[bot] roleDelete sync failed:', e.message);
  }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    const before = oldMember.roles.cache;
    const after = newMember.roles.cache;
    const added = after.filter((r) => !before.has(r.id) && !KNOWN_ROLE_IDS.has(r.id) && !r.managed);
    const removed = before.filter((r) => !after.has(r.id) && !KNOWN_ROLE_IDS.has(r.id) && !r.managed);
    for (const role of added.values()) {
      await callSite('grant_badge', { discord_id: newMember.id, badge_id: dynamicBadgeKey(role.id) });
    }
    for (const role of removed.values()) {
      await callSite('revoke_badge', { discord_id: newMember.id, badge_id: dynamicBadgeKey(role.id) });
    }
  } catch (e) {
    console.error('[bot] guildMemberUpdate badge sync failed:', e.message);
  }
});

// ── Role helpers ─────────────────────────────────────────────────────────────
async function setRole(discordId, roleId, grant) {
  if (!roleId) throw new Error('Role ID not configured');
  const guild = await getGuild();
  const member = await guild.members.fetch(discordId);
  if (grant) {
    if (!member.roles.cache.has(roleId)) await member.roles.add(roleId);
  } else {
    if (member.roles.cache.has(roleId)) await member.roles.remove(roleId);
  }
}

// ── Express API ──────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const key = req.header('X-Api-Key') || req.query.key;
  if (!key || key !== API_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
});

const DISCORD_ID_RE = /^\d{17,20}$/;
function requireDiscordId(req, res, source) {
  const id = source === 'params' ? req.params.id : req.body.discord_id;
  if (!id || !DISCORD_ID_RE.test(id)) {
    res.status(400).json({ success: false, error: 'Invalid or missing discord_id' });
    return null;
  }
  return id;
}

app.get('/health', (req, res) => {
  res.json({ success: true, ready: client.isReady(), guild: DISCORD_GUILD_ID });
});

// GET /member/:id — used to verify guild membership + pull profile data (OAuth + manual connect)
app.get('/member/:id', async (req, res) => {
  const id = requireDiscordId(req, res, 'params');
  if (!id) return;
  try {
    const guild = await getGuild();
    const member = await guild.members.fetch(id);
    res.json({
      success: true,
      in_guild: true,
      data: {
        id: member.user.id,
        username: member.user.username,
        global_name: member.user.globalName || member.user.username,
        avatar: member.user.avatar,
      },
    });
  } catch (e) {
    // Unknown Member / Unknown User → not in guild
    res.json({ success: true, in_guild: false });
  }
});

// GET /presence/:id
app.get('/presence/:id', async (req, res) => {
  const id = requireDiscordId(req, res, 'params');
  if (!id) return;
  try {
    const guild = await getGuild();
    const member = await guild.members.fetch(id);
    const presence = member.presence;
    res.json({
      success: true,
      data: {
        status: presence?.status || 'offline',
        clientStatus: presence?.clientStatus || null,
        activities: (presence?.activities || []).map(a => ({
          name: a.name,
          type: a.type,
          details: a.details || null,
          state: a.state || null,
          url: a.url || null,
          applicationId: a.applicationId || null,
          start: a.timestamps?.start ? a.timestamps.start.getTime() : null,
          end: a.timestamps?.end ? a.timestamps.end.getTime() : null,
          largeImage: a.assets?.largeImageURL({ size: 256 }) || null,
          largeText: a.assets?.largeText || null,
          smallImage: a.assets?.smallImageURL({ size: 64 }) || null,
          smallText: a.assets?.smallText || null,
          emoji: a.emoji ? { name: a.emoji.name, url: a.emoji.id ? a.emoji.imageURL() : null } : null,
        })),
      },
    });
  } catch (e) {
    res.json({ success: true, data: { status: 'offline', activities: [] } });
  }
});

function roleEndpoint(path, roleIdRef, grant) {
  app.post(path, async (req, res) => {
    const id = requireDiscordId(req, res, 'body');
    if (!id) return;
    try {
      await setRole(id, roleIdRef, grant);
      res.json({ success: true, message: `Role ${grant ? 'assigned' : 'removed'}.` });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
}

roleEndpoint('/assign-infected-role', DISCORD_ROLE_INFECTED, true);
roleEndpoint('/remove-infected-role', DISCORD_ROLE_INFECTED, false);
roleEndpoint('/assign-premium-role', DISCORD_ROLE_PREMIUM, true);
roleEndpoint('/remove-premium-role', DISCORD_ROLE_PREMIUM, false);
roleEndpoint('/assign-verified-role', DISCORD_ROLE_VERIFIED, true);
roleEndpoint('/remove-verified-role', DISCORD_ROLE_VERIFIED, false);

// POST /badge-role { discord_id, badge_id, grant } — generic sync for site "grades" (profile badges) -> Discord roles
app.post('/badge-role', async (req, res) => {
  const id = requireDiscordId(req, res, 'body');
  if (!id) return;
  const badgeId = String(req.body.badge_id || '');
  const grant = !!req.body.grant;
  // Explicit role_id (dynamic/DB-backed badges) takes priority over the hardcoded BADGE_ROLE_MAP lookup.
  const roleId = req.body.role_id ? String(req.body.role_id) : BADGE_ROLE_MAP[badgeId];
  if (!roleId) {
    return res.status(400).json({ success: false, error: `No Discord role configured for badge '${badgeId}'` });
  }
  try {
    await setRole(id, roleId, grant);
    res.json({ success: true, message: `Role for badge '${badgeId}' ${grant ? 'assigned' : 'removed'}.` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /create-role { name, color } — creates a new guild role (used when a badge is created from the site)
app.post('/create-role', async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 90);
  const color = req.body.color ? String(req.body.color) : undefined;
  if (!name) return res.status(400).json({ success: false, error: 'Missing role name' });
  try {
    const guild = await getGuild();
    const role = await guild.roles.create({ name, color, hoist: false, mentionable: false, reason: 'Badge created from infected.wtf admin panel' });
    res.json({ success: true, role_id: role.id });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /delete-role { role_id } — removes a guild role (used when a dynamic badge is deleted from the site)
app.post('/delete-role', async (req, res) => {
  const roleId = String(req.body.role_id || '');
  if (!/^\d{17,20}$/.test(roleId)) return res.status(400).json({ success: false, error: 'Invalid role_id' });
  try {
    const guild = await getGuild();
    await guild.roles.delete(roleId, 'Badge deleted from infected.wtf admin panel');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /ban { discord_id, reason }
app.post('/ban', async (req, res) => {
  const id = requireDiscordId(req, res, 'body');
  if (!id) return;
  const reason = (req.body.reason || 'Banned on infected.wtf').slice(0, 500);
  try {
    const guild = await getGuild();
    await guild.members.ban(id, { reason });
    logToChannel(`🔨 <@${id}> was banned (synced from the site). Reason: ${reason}`);
    res.json({ success: true, message: 'Banned on Discord.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /unban { discord_id }
app.post('/unban', async (req, res) => {
  const id = requireDiscordId(req, res, 'body');
  if (!id) return;
  try {
    const guild = await getGuild();
    await guild.members.unban(id, 'Unbanned on infected.wtf');
    logToChannel(`✅ <@${id}> was unbanned (synced from the site).`);
    res.json({ success: true, message: 'Unbanned on Discord.' });
  } catch (e) {
    // Not banned on Discord — treat as success (idempotent)
    if (String(e.message).toLowerCase().includes('unknown ban')) {
      return res.json({ success: true, message: 'User was not banned on Discord.' });
    }
    res.status(500).json({ success: false, error: e.message });
  }
});

// Inside a Pterodactyl container the panel assigns the port (SERVER_PORT) and the API must listen on all
// interfaces to be reachable through the published port; elsewhere stay on loopback.
const inPanel = !!process.env.P_SERVER_UUID;
const port = Number(PORT || process.env.SERVER_PORT) || 4001;
const host = process.env.BIND_HOST || (inPanel ? '0.0.0.0' : '127.0.0.1');
app.listen(port, host, () => {
  console.log(`[api] Listening on http://${host}:${port}`);
});
