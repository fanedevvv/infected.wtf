#!/usr/bin/env node
// Posts a commit embed to Discord. Called from the pre-push git hook (see .githooks/pre-push).
// Title = commit subject line. Description = commit body (the "- bullet" lines written at commit
// time), followed by the actual list of changed files for that commit (same info as the editor's
// Source Control > Changes panel), so the embed always shows what was really touched.

const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
try {
  process.loadEnvFile(path.join(repoRoot, ".env"));
} catch {
  // .env missing — DISCORD_BOT_TOKEN may still be set in the environment
}

const CHANNEL_ID = "1536633324368298114";
const EMBED_COLOR = 0x39ff14;

const STATUS_LABEL = { A: "added", D: "deleted", M: "modified", R: "renamed", C: "copied", T: "type changed" };

function formatChangedFiles(raw) {
  const lines = (raw || "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  const formatted = lines.map((line) => {
    const parts = line.split("\t");
    const code = parts[0][0];
    const label = STATUS_LABEL[code] || code;
    const filePath = code === "R" || code === "C" ? `${parts[1]} → ${parts[2]}` : parts[1];
    return `${label[0].toUpperCase()} ${filePath}`;
  });
  const MAX_LINES = 25;
  const shown = formatted.slice(0, MAX_LINES);
  let block = shown.join("\n");
  if (formatted.length > MAX_LINES) block += `\n… and ${formatted.length - MAX_LINES} more file(s)`;
  return "```\n" + block + "\n```";
}

async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error("[discord-notify] DISCORD_BOT_TOKEN not set, skipping push notification");
    return;
  }

  const title = (process.argv[2] || "(no commit title)").slice(0, 256);
  const body = (process.argv[3] || "").trim();
  const filesBlock = formatChangedFiles(process.argv[4]);

  const descParts = [];
  if (body) descParts.push(body);
  if (filesBlock) descParts.push(`**Files changed:**\n${filesBlock}`);
  const description = (descParts.join("\n\n") || "_No description._").slice(0, 4000);

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
