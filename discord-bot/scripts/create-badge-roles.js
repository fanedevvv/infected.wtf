// One-off setup script: creates a Discord role for each site "grade" (badge) that doesn't
// have one yet, and writes the resulting role IDs into discord-bot/.env as DISCORD_ROLE_<BADGE>.
// Run with: node scripts/create-badge-roles.js   (from the discord-bot/ directory)

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits } = require("discord.js");

// badge id -> [role name, hex color, hoist?]
const BADGE_ROLES = {
  owner: ["Owner", "#FBBF24", true],
  admin: ["Admin", "#39FF14", true],
  champion: ["Champion", "#C0C0C0"],
  hall_of_fame: ["Hall of Fame", "#F59E0B"],
  fresh: ["Fresh", "#00E5FF"],
  lover: ["Lover", "#FF4D8D"],
  known: ["Known", "#B497FF"],
  rich: ["Rich", "#2ECC71"],
  trapstar: ["Trapstar", "#8E44AD"],
  the_killer: ["The Killer", "#E74C3C"],
  crew: ["Crew", "#3498DB"],
  billionaire: ["Billionaire", "#F1C40F"],
  content_creator: ["Content Creator", "#FF6B6B"],
  designer: ["Designer", "#1ABC9C"],
  discord: ["Discord Linked", "#5865F2"],
  og: ["OG", "#A78BFA"],
  views_master: ["Views Master", "#38BDF8"],
  promoter: ["Promoter", "#9CA3AF"],
  promoter_elite: ["Promoter Elite", "#D1D5DB"],
};

const ENV_PATH = path.join(__dirname, "..", ".env");

function envVarName(badgeId) {
  return `DISCORD_ROLE_${badgeId.toUpperCase()}`;
}

function upsertEnvVars(updates) {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  const lines = content.split("\n");
  for (const [key, value] of Object.entries(updates)) {
    const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
    if (idx >= 0) lines[idx] = `${key}=${value}`;
    else lines.push(`${key}=${value}`);
  }
  content = lines.join("\n");
  if (!content.endsWith("\n")) content += "\n";
  fs.writeFileSync(ENV_PATH, content);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const existingRoles = await guild.roles.fetch();

    const updates = {};
    for (const [badgeId, [roleName, color, hoist]] of Object.entries(BADGE_ROLES)) {
      const envKey = envVarName(badgeId);
      const alreadyConfigured = process.env[envKey];
      if (alreadyConfigured) {
        console.log(`[skip] ${envKey} already set (${alreadyConfigured})`);
        continue;
      }

      let role = existingRoles.find((r) => r.name === roleName);
      if (role) {
        console.log(`[found] "${roleName}" already exists (${role.id}) — reusing`);
      } else {
        role = await guild.roles.create({
          name: roleName,
          color,
          hoist: !!hoist,
          mentionable: false,
          reason: "infected.wtf grade/badge sync",
        });
        console.log(`[created] "${roleName}" -> ${role.id}`);
      }
      updates[envKey] = role.id;
    }

    if (Object.keys(updates).length > 0) {
      upsertEnvVars(updates);
      console.log(`\nWrote ${Object.keys(updates).length} role id(s) to ${ENV_PATH}`);
    } else {
      console.log("\nNothing to do — all roles already configured.");
    }
  } catch (e) {
    console.error("Failed:", e);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
