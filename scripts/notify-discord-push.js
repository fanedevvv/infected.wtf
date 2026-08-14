#!/usr/bin/env node
// Posts ONE Discord embed per push (not per commit). Called from the pre-push git hook
// (see .githooks/pre-push) with the full list of commit titles being pushed and the combined
// file diff for the whole push.

const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
try {
  process.loadEnvFile(path.join(repoRoot, ".env"));
} catch {
  // .env missing — DISCORD_BOT_TOKEN may still be set in the environment
}

const CHANNEL_ID = "1536633324368298114";
const EMBED_COLOR = 0x39ff14;
const MAX_FILE_LINES = 8;
const MAX_TITLE_LINES = 6;

const STATUS_LABEL = { A: "A", D: "D", M: "M", R: "R", C: "C", T: "T" };

function formatChangedFiles(raw) {
  const lines = (raw || "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  const formatted = lines.map((line) => {
    const parts = line.split("\t");
    const code = STATUS_LABEL[parts[0][0]] || parts[0][0];
    const filePath = parts[0][0] === "R" || parts[0][0] === "C" ? `${parts[1]} → ${parts[2]}` : parts[1];
    return `${code} ${filePath}`;
  });
  const shown = formatted.slice(0, MAX_FILE_LINES);
  let block = shown.join("\n");
  if (formatted.length > MAX_FILE_LINES) block += `\n+${formatted.length - MAX_FILE_LINES} more`;
  return "```\n" + block + "\n```";
}

function formatTitles(raw) {
  const lines = (raw || "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { headline: "(no commit title)", extra: "" };
  if (lines.length === 1) return { headline: lines[0], extra: "" };
  const shown = lines.slice(0, MAX_TITLE_LINES).map((t) => `- ${t}`);
  if (lines.length > MAX_TITLE_LINES) shown.push(`- +${lines.length - MAX_TITLE_LINES} more commit(s)`);
  return { headline: `${lines.length} commits pushed`, extra: shown.join("\n") };
}

async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error("[discord-notify] DISCORD_BOT_TOKEN not set, skipping push notification");
    return;
  }

  const { headline, extra } = formatTitles(process.argv[2]);
  const filesBlock = formatChangedFiles(process.argv[3]);

  const descParts = [];
  if (extra) descParts.push(extra);
  if (filesBlock) descParts.push(filesBlock);
  const description = (descParts.join("\n") || "_No changes._").slice(0, 4000);

  const res = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: headline.slice(0, 256),
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
    console.log("[discord-notify] posted push embed to Discord");
  }
}

main().catch((e) => console.error("[discord-notify] error:", e.message));
