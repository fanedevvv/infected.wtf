#!/usr/bin/env node
// Posts a commit embed to Discord. Called from the pre-push git hook (see .githooks/pre-push).
// Title = commit subject line, description = commit body (the "- bullet" lines written at commit time).

const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
try {
  process.loadEnvFile(path.join(repoRoot, ".env"));
} catch {
  // .env missing — DISCORD_BOT_TOKEN may still be set in the environment
}

const CHANNEL_ID = "1536633324368298114";
const EMBED_COLOR = 0x39ff14;

async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error("[discord-notify] DISCORD_BOT_TOKEN not set, skipping push notification");
    return;
  }

  const title = (process.argv[2] || "(no commit title)").slice(0, 256);
  const description = (process.argv[3] || "").trim().slice(0, 4000) || "_No description._";

  const res = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title,
          description,
          color: EMBED_COLOR,
          footer: { text: "infected dev" },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("[discord-notify] failed to post:", res.status, await res.text().catch(() => ""));
  } else {
    console.log("[discord-notify] posted commit embed to Discord");
  }
}

main().catch((e) => console.error("[discord-notify] error:", e.message));
