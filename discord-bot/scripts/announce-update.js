// Posts one site update to #updates as an embed. Called by scripts/auto-push.sh after a successful push when
// announcements/pending.json exists (only written for big, user-visible changes — see CLAUDE.md).
//   node discord-bot/scripts/announce-update.js announcements/pending.json
//
// pending.json: { "title": "...", "summary": "...", "changes": ["...", "..."], "kind": "feature|layout|fix|design",
//                 "link": "https://infected.wtf/..." (optional), "linkLabel": "..." (optional) }

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");

const CHANNEL_UPDATES = "1572950112445923428";
const SITE = "https://infected.wtf";
const E = require(path.join(__dirname, "..", "emojis.json"));
const KIND = {
  feature: { emoji: E.inf_rocket, label: "NEW FEATURE", color: 0xc6ff3d },
  layout: { emoji: E.inf_palette, label: "NEW LOOK", color: 0xb14fff },
  design: { emoji: E.inf_sparkle, label: "REDESIGN", color: 0x4fd0ff },
  fix: { emoji: E.inf_shield, label: "FIX", color: 0xffb020 },
};

(async () => {
  const file = process.argv[2];
  if (!file) throw new Error("usage: announce-update.js <pending.json>");
  const u = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!u.title || !Array.isArray(u.changes) || u.changes.length === 0) throw new Error("pending.json needs a title and at least one change");
  const kind = KIND[u.kind] || KIND.feature;
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Bucharest" });

  const description = [
    `-# ${kind.emoji} ${kind.label} · ${date}`,
    `## ${u.title}`,
    u.summary ? `${u.summary}\n` : "",
    ...u.changes.slice(0, 12).map((c) => `${E.inf_dot} ${c}`),
  ].filter((l) => l !== "").join("\n").slice(0, 4000);

  const buttons = [[u.linkLabel || "Open infected.wtf", u.link || SITE], ["Changelog", "https://docs.infected.wtf/?page=changelog"]];
  const body = {
    content: "",
    allowed_mentions: { parse: [] },
    embeds: [{ color: kind.color, description, footer: { text: "INFECTED.WTF · get infected" }, timestamp: new Date().toISOString() }],
    components: [{ type: 1, components: buttons.map(([label, url]) => ({ type: 2, style: 5, label: label.slice(0, 80), url })) }],
  };

  const res = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_UPDATES}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Discord answered ${res.status}: ${await res.text()}`);
  const msg = await res.json();
  console.log(`posted update "${u.title}" (${msg.id})`);
})().catch((e) => {
  console.error("announce failed:", e.message);
  process.exit(1);
});
