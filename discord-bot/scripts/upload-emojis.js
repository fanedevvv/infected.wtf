// Draws the bot's custom emojis (site colors), uploads them as *application* emojis (they don't use
// server emoji slots and work in any channel the bot posts in) and saves the name → markup map to
// discord-bot/emojis.json. Re-running replaces emojis whose artwork changed.
// Run from discord-bot/:  node scripts/upload-emojis.js

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sharp = require(path.join(__dirname, "..", "..", "node_modules", "sharp"));

const API = "https://discord.com/api/v10";
const headers = { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" };
const OUT = path.join(__dirname, "..", "emojis.json");

const LIME = "#c6ff3d";
const GOLD = "#fbbf24";
const GREEN = "#22c55e";
const RED = "#ef4444";
const BLUE = "#38bdf8";
const INK = "#0b0c09";

// Stroke icon on a 24×24 grid (lucide-style paths), drawn thick so it reads at emoji size.
const stroke = (color, d, extra = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${d}${extra}</svg>`;
// Filled badge: colored disc with a dark glyph on top.
const disc = (bg, glyph) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="${bg}"/><g fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${glyph}</g></svg>`;

const ICONS = {
  // the site mark (components/lab/LabMark.tsx): a nucleus with eight spikes
  inf_logo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g stroke="${LIME}" stroke-width="3" stroke-linecap="square" fill="none"><path d="M16 3v6M16 23v6M3 16h6M23 16h6M6.8 6.8l4.3 4.3M20.9 20.9l4.3 4.3M25.2 6.8l-4.3 4.3M11.1 20.9l-4.3 4.3"/></g><circle cx="16" cy="16" r="5.8" fill="${LIME}"/></svg>`,
  inf_dot: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5.5" fill="${LIME}"/></svg>`,
  inf_check: disc(GREEN, `<path d="M7 12.5l3.2 3.2L17 9"/>`),
  inf_verified: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${GREEN}" d="M12 1.5l2.6 1.9 3.2-.2 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.2L12 22.5l-2.6-1.9-3.2.2-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.2z"/><path d="M7.8 12.3l2.8 2.8 5.6-5.6" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  inf_plus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${GOLD}" d="M12 1.8l3 6.4 7 .8-5.2 4.8 1.4 6.9L12 17.2l-6.2 3.5 1.4-6.9L2 9l7-.8z"/></svg>`,
  inf_token: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="${GOLD}"/><circle cx="12" cy="12" r="7.3" fill="none" stroke="#b45309" stroke-width="1.6"/><path d="M12 7.5l1.3 3.2 3.2 1.3-3.2 1.3L12 16.5l-1.3-3.2L7.5 12l3.2-1.3z" fill="#b45309"/></svg>`,
  inf_crown: stroke(GOLD, `<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/><path d="M5 19h14"/>`),
  inf_shield: stroke(LIME, `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>`),
  inf_hammer: stroke(BLUE, `<path d="M15 12l-8.5 8.5a2.1 2.1 0 0 1-3-3L12 9"/><path d="M17.6 15L22 10.6"/><path d="M20.9 11.7l-9.6-9.6-3 3 9.6 9.6z"/>`),
  inf_gift: stroke(LIME, `<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>`),
  inf_sparkle: stroke(LIME, `<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>`),
  inf_eye: stroke(LIME, `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>`),
  inf_users: stroke(LIME, `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>`),
  inf_trophy: stroke(GOLD, `<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.7V17c0 .6-.5 1-1 1.2C7.9 18.8 7 20.2 7 22"/><path d="M14 14.7V17c0 .6.5 1 1 1.2 1.2.6 2 2 2 3.8"/><path d="M18 2H6v7a6 6 0 0 0 12 0z"/>`),
  inf_shop: stroke(LIME, `<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>`),
  inf_badge: stroke(LIME, `<circle cx="12" cy="8" r="6"/><path d="M15.5 13.1L17 22l-5-3-5 3 1.5-8.9"/>`),
  inf_palette: stroke(LIME, `<circle cx="13.5" cy="6.5" r="1.2"/><circle cx="17.5" cy="10.5" r="1.2"/><circle cx="8.5" cy="7.5" r="1.2"/><circle cx="6.5" cy="12.5" r="1.2"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.8 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.7 1.7-1.7h2c3.1 0 5.6-2.5 5.6-5.6C22 6 17.5 2 12 2z"/>`),
  inf_link: stroke(LIME, `<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>`),
  inf_card: stroke(LIME, `<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>`),
  inf_warning: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${RED}" d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5M12 17h.01" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  inf_rocket: stroke(LIME, `<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0"/><path d="M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>`),
  inf_fire: stroke("#f97316", `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.3.6 1.1 1.5 2 2.5 2.3z"/>`),
  inf_globe: stroke(LIME, `<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`),
  inf_chart: stroke(LIME, `<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>`),
  inf_ban: stroke(RED, `<circle cx="12" cy="12" r="10"/><path d="M4.9 4.9l14.2 14.2"/>`),
  inf_unban: stroke(GREEN, `<path d="M7 11V7a5 5 0 0 1 9.9-1"/><rect x="3" y="11" width="18" height="11" rx="2"/>`),
};

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

async function render(name) {
  return sharp(Buffer.from(ICONS[name]), { density: 600 }).resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

(async () => {
  const app = await call("GET", "/applications/@me");
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
  const hashes = prev._hashes || {};
  const current = (await call("GET", `/applications/${app.id}/emojis`)).items;
  const map = {};

  for (const name of Object.keys(ICONS)) {
    const png = await render(name);
    const hash = crypto.createHash("sha1").update(png).digest("hex").slice(0, 12);
    let emoji = current.find((e) => e.name === name);
    if (emoji && hashes[name] && hashes[name] !== hash) {
      await call("DELETE", `/applications/${app.id}/emojis/${emoji.id}`);
      emoji = null;
    }
    if (!emoji) {
      emoji = await call("POST", `/applications/${app.id}/emojis`, { name, image: `data:image/png;base64,${png.toString("base64")}` });
      console.log(`[uploaded] ${name}`);
    } else {
      console.log(`[kept]     ${name}`);
    }
    hashes[name] = hash;
    map[name] = `<:${name}:${emoji.id}>`;
  }

  fs.writeFileSync(OUT, JSON.stringify({ ...map, _hashes: hashes }, null, 2) + "\n");
  console.log(`\nSaved ${Object.keys(map).length} emojis to ${OUT}`);
})().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
