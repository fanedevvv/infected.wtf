require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
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
  PORT,
  DB_HOST,
  DB_USER,
  DB_PASS,
  DB_NAME,
} = process.env;

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

// ── DB pool (used only for the Discord → site ban sync direction) ──────────────
const pool = mysql.createPool({
  host: DB_HOST || 'localhost',
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME || 'biolink',
  waitForConnections: true,
  connectionLimit: 5,
});

async function setSiteBanStateByDiscordId(discordId, banned) {
  const [rows] = await pool.query(
    `SELECT u.id FROM users u
     JOIN integrations i ON i.user_id = u.id AND i.type = 'discord'
     WHERE i.discord_user_id = ? LIMIT 1`,
    [discordId]
  );
  if (!rows.length) return null;
  const userId = rows[0].id;
  await pool.query(
    banned
      ? 'UPDATE users SET banned=1, ban_until=NULL WHERE id=?'
      : 'UPDATE users SET banned=0, ban_until=NULL WHERE id=?',
    [userId]
  );
  return userId;
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
        activities: (presence?.activities || []).map(a => ({
          name: a.name,
          type: a.type,
          details: a.details || null,
          state: a.state || null,
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

const port = Number(PORT) || 4001;
app.listen(port, '127.0.0.1', () => {
  console.log(`[api] Listening on http://127.0.0.1:${port}`);
});
