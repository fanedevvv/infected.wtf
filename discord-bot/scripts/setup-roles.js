// One-off / re-runnable setup: creates a Discord role for every site grade that doesn't have one yet,
// writes the role IDs into discord-bot/.env (DISCORD_ROLE_<KEY>) and orders them in the server.
// Existing roles with the same name are reused, so running it again is safe.
// Run from discord-bot/:  node scripts/setup-roles.js   (then: pm2 restart infected-discord-bot)

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");

const { DISCORD_BOT_TOKEN, DISCORD_GUILD_ID } = process.env;
const API = "https://discord.com/api/v10";
const headers = { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" };

// Top → bottom, the order they appear in the member list. [env key, role name, hex color, hoist]
const ROLES = [
  ["OWNER", "Owner", "#FBBF24", true],
  ["ADMIN", "Admin", "#C6FF3D", true],
  ["MOD", "Moderator", "#38BDF8", true],
  ["PREMIUM", "Infected Plus", "#FFD700", true],
  ["VERIFIED", "Verified", "#22C55E", false],
  ["CREW", "Crew", "#3498DB", false],
  ["BILLIONAIRE", "Billionaire", "#F1C40F", false],
  ["CONTENT_CREATOR", "Content Creator", "#FF6B6B", false],
  ["DESIGNER", "Designer", "#1ABC9C", false],
  ["VIEWS_MASTER", "Views Master", "#A78BFA", false],
  ["CHAMPION", "Champion", "#C0C0C0", false],
  ["HALL_OF_FAME", "Hall of Fame", "#F59E0B", false],
  ["OG", "OG", "#8B5CF6", false],
  ["THE_KILLER", "The Killer", "#EF4444", false],
  ["TRAPSTAR", "Trapstar", "#F97316", false],
  ["RICH", "Rich", "#FBBF24", false],
  ["LOVER", "Lover", "#FF6BA0", false],
  ["KNOWN", "Known", "#60A5FA", false],
  ["FRESH", "Fresh", "#A8D8FF", false],
  ["PROMOTER_ELITE", "Promoter Elite", "#D1D5DB", false],
  ["PROMOTER", "Promoter", "#9CA3AF", false],
  ["DISCORD", "Discord Linked", "#5865F2", false],
  ["INFECTED", "Infected", "#7FA82B", false],
];

const ENV_PATH = path.join(__dirname, "..", ".env");

function upsertEnv(updates) {
  const lines = (fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "").split("\n");
  for (const [key, value] of Object.entries(updates)) {
    const i = lines.findIndex((l) => l.startsWith(`${key}=`));
    if (i >= 0) lines[i] = `${key}=${value}`;
    else lines.splice(lines[lines.length - 1] === "" ? lines.length - 1 : lines.length, 0, `${key}=${value}`);
  }
  let out = lines.join("\n");
  if (!out.endsWith("\n")) out += "\n";
  fs.writeFileSync(ENV_PATH, out);
}

async function call(method, route, body) {
  const res = await fetch(API + route, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 429) {
    const { retry_after } = await res.json();
    await new Promise((r) => setTimeout(r, (retry_after || 1) * 1000 + 250));
    return call(method, route, body);
  }
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(`${method} ${route} → ${res.status} ${JSON.stringify(data)}`);
  return data;
}

(async () => {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) throw new Error("DISCORD_BOT_TOKEN / DISCORD_GUILD_ID missing in .env");
  let existing = await call("GET", `/guilds/${DISCORD_GUILD_ID}/roles`);
  const updates = {};
  const ids = [];

  for (const [key, name, color, hoist] of ROLES) {
    const envKey = `DISCORD_ROLE_${key}`;
    let role = existing.find((r) => r.id === process.env[envKey]) || existing.find((r) => r.name === name);
    if (role) {
      console.log(`[reuse]   ${name.padEnd(16)} ${role.id}`);
    } else {
      role = await call("POST", `/guilds/${DISCORD_GUILD_ID}/roles`, {
        name, color: parseInt(color.slice(1), 16), hoist, mentionable: false,
      });
      console.log(`[created] ${name.padEnd(16)} ${role.id}`);
    }
    if (process.env[envKey] !== role.id) updates[envKey] = role.id;
    ids.push(role.id);
  }

  // Order: keep everything we don't manage where it is, and stack ours (top → bottom) just under the bot's top role.
  existing = await call("GET", `/guilds/${DISCORD_GUILD_ID}/roles`);
  const me = await call("GET", "/users/@me");
  const member = await call("GET", `/guilds/${DISCORD_GUILD_ID}/members/${me.id}`);
  const botTop = Math.max(...existing.filter((r) => member.roles.includes(r.id)).map((r) => r.position));
  const ours = new Set(ids);
  const others = existing.filter((r) => !ours.has(r.id) && r.position < botTop && r.position > 0).sort((a, b) => b.position - a.position);
  // Below the bot: our roles first (top→bottom), then any other roles that were already there.
  const stack = [...ids, ...others.map((r) => r.id)];
  const positions = stack.map((id, i) => ({ id, position: botTop - 1 - i })).filter((p) => p.position > 0);
  await call("PATCH", `/guilds/${DISCORD_GUILD_ID}/roles`, positions);
  console.log(`[order]   ${ids.length} roles placed under the bot role`);

  if (Object.keys(updates).length) {
    upsertEnv(updates);
    console.log(`\nWrote ${Object.keys(updates).length} role id(s) to ${ENV_PATH} — restart the bot to load them.`);
  } else {
    console.log("\n.env already up to date.");
  }
})().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
