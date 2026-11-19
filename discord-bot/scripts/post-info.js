// Posts (or updates in place) the bot's info messages: #pricing and #roles.
// Facts mirror the site — prices: lib/docs.tsx "Pricing & Plans"; perks: "Plans"; badges: lib/shop.ts + "Badges";
// staff powers: app/api/admin_action/route.ts. Update both when anything changes, then re-run:
//   node scripts/post-info.js            (from discord-bot/)
// Re-running edits the bot's existing messages in each channel instead of posting duplicates.

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const path = require("path");

const API = "https://discord.com/api/v10";
const headers = { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" };
const E = require(path.join(__dirname, "..", "emojis.json"));
const R = (key) => (process.env[`DISCORD_ROLE_${key}`] ? `<@&${process.env[`DISCORD_ROLE_${key}`]}>` : `**${key}**`);

const CHANNEL_PRICING = "1572865920320147477";
const CHANNEL_ROLES = "1572865955883782235";
const SITE = "https://infected.wtf";
const DOCS = "https://docs.infected.wtf";
const COLOR = 0xc6ff3d;

const dot = E.inf_dot;
const list = (items) => items.map((i) => `${dot} ${i}`).join("\n");
const buttons = (links) => [{ type: 1, components: links.map(([label, url]) => ({ type: 2, style: 5, label, url })) }];

/* ───────────── #pricing ───────────── */

const pricing = {
  embeds: [
    {
      color: COLOR,
      description: [
        `## ${E.inf_logo} INFECTED.WTF PRICING`,
        `**Payment** for any **benefit** on the platform is made only through the **platform** or privately with the __owners__ (${R("OWNER")}). We are not __responsible__ for possible material losses resulting from online scams.`,
        "",
        "**GET STARTED**",
        `Below are the benefits you can get by paying on ***[infected.wtf](${SITE})***`,
        "-# **little hint:** one-time purchases are yours forever",
        "Total control at the best price!",
      ].join("\n"),
    },
    {
      color: COLOR,
      title: "OUR PLANS:",
      description: [
        `${E.inf_logo} **Free — €0** *(forever)*`,
        list([
          "Full profile editor & 5 layout templates",
          "Social links, Discord & Spotify widgets",
          "Game integrations, comments & views chart",
          "Daily spin & tokens for every profile view",
        ]),
        "",
        `${E.inf_plus} **Infected Plus — €7** *(lifetime)*`,
        list([
          "Everything in Free",
          "7 premium layouts — Deck, Orbit, Terminal, Scrapbook, Hex Grid, Vinyl, Constellation",
          `Plus name glow, Plus badge & the ${R("PREMIUM")} role`,
          "Analytics — countries, browsers, devices & top links",
          "3 pages, 10 aliases & premium custom domains",
          "5 tokens per view & 20 per referral",
          "No INFECTED.WTF footer on your page",
        ]),
        "-# or activate it with tokens — 100 tokens / day",
        "",
        `${E.inf_verified} **Verified Badge — €5**`,
        list([
          "Exclusive green Verified badge",
          `Special ${R("VERIFIED")} role on the server`,
          "Stand out as a trusted member",
          "Increased credibility",
        ]),
        "-# can also be won on the daily spin",
        "",
        `${E.inf_gift} **Gift Infected Plus — €7**`,
        list(["Give a friend lifetime Plus", "Plus members can gift it with tokens instead"]),
      ].join("\n"),
    },
    {
      color: COLOR,
      title: "TOKEN PACKS:",
      description: [
        `${E.inf_token} **150 tokens** — €0.99`,
        `${E.inf_token} **450 tokens** — €2.99`,
        `${E.inf_token} **700 tokens** *(+70 bonus)* — €4.99`,
        `${E.inf_token} **1,500 tokens** *(+150 bonus)* — €8.99`,
        `${E.inf_token} **2,000 tokens** *(+250 bonus)* — €9.99`,
        `-# ${E.inf_fire} during x2 token events every pack gives double`,
        "",
        `${E.inf_shop} **Spend them on**`,
        list([
          "Badges — 50 to 1,500 tokens",
          "Cursor & background effects — 150 to 1,000 tokens",
          "Avatar decorations & marketplace themes",
          "Infected Plus days, or send tokens to friends",
        ]),
      ].join("\n"),
    },
  ],
  components: buttons([
    ["Make Your Page", `${SITE}/register`],
    ["Pricing", `${DOCS}/?page=pricing`],
    ["Shop", `${SITE}/dashboard?page=shop`],
  ]),
};

/* ───────────── #roles ───────────── */

const roles = {
  embeds: [
    {
      color: COLOR,
      description: [
        `## ${E.inf_logo} INFECTED.WTF ROLES`,
        "Every grade on the site has a matching role here.",
        `**Link your Discord** on [infected.wtf](${SITE}/dashboard?page=integrations) and your roles are given **automatically** — and removed when you lose the grade.`,
        `-# linking alone gets you ${R("INFECTED")} + ${R("DISCORD")}`,
      ].join("\n"),
    },
    {
      color: COLOR,
      title: "STAFF:",
      description: [
        `${E.inf_crown} ${R("OWNER")}`,
        list([
          "Full control of the platform",
          "Manages roles, tokens, Infected Plus, badges, effects & decorations",
          "Redeem codes, bundles, domains, x2 token events & email templates",
          "Can ban or delete anyone except other Owners",
        ]),
        "",
        `${E.inf_shield} ${R("ADMIN")}`,
        list([
          "Admin panel — users, reports, project reviews & partners",
          "Permanent or temporary bans (up to 7 / hour)",
          "Deletes accounts (up to 5 / hour)",
          "Can't act on Owners or other Admins",
        ]),
        "",
        `${E.inf_hammer} ${R("MOD")}`,
        list([
          "Handles reports and reviews projects",
          "Temporary bans for regular users (up to 3 / hour)",
          "Can't act on staff",
        ]),
      ].join("\n"),
    },
    {
      color: COLOR,
      title: "SUPPORTERS & SPECIAL:",
      description: [
        `${E.inf_plus} ${R("PREMIUM")} — active Infected Plus, with every Plus perk (see <#${CHANNEL_PRICING}>)`,
        `${E.inf_verified} ${R("VERIFIED")} — bought the Verified badge (€5) or won it on the daily spin`,
        `${E.inf_badge} ${R("CREW")} ${R("BILLIONAIRE")} ${R("CONTENT_CREATOR")} ${R("DESIGNER")} — handed out by the team`,
      ].join("\n"),
    },
    {
      color: COLOR,
      title: "EARNED AUTOMATICALLY:",
      description: [
        `${E.inf_trophy} ${R("OG")} — one of the first 1,000 accounts`,
        `${E.inf_eye} ${R("HALL_OF_FAME")} — reach 1,000 profile views`,
        `${E.inf_eye} ${R("CHAMPION")} — reach 10,000 profile views`,
        `${E.inf_chart} ${R("VIEWS_MASTER")} — be in the top 3 most-viewed profiles`,
        `${E.inf_users} ${R("PROMOTER")} — invite 10 people with your referral link`,
        `${E.inf_users} ${R("PROMOTER_ELITE")} — invite 20 people`,
        `${E.inf_link} ${R("DISCORD")} — link your Discord account`,
        `${E.inf_rocket} **Server Booster** — boost this server`,
      ].join("\n"),
    },
    {
      color: COLOR,
      title: "SHOP BADGES:",
      description: [
        "Bought with tokens in the shop — yours forever:",
        `${E.inf_token} ${R("FRESH")} — 50 tokens`,
        `${E.inf_token} ${R("KNOWN")} — 250 tokens`,
        `${E.inf_token} ${R("LOVER")} — 300 tokens`,
        `${E.inf_token} ${R("RICH")} — 500 tokens`,
        `${E.inf_token} ${R("TRAPSTAR")} — 1,000 tokens`,
        `${E.inf_token} ${R("THE_KILLER")} — 1,500 tokens`,
      ].join("\n"),
    },
  ],
  components: buttons([
    ["Link Discord", `${SITE}/dashboard?page=integrations`],
    ["Badges guide", `${DOCS}/?page=badges`],
    ["Shop", `${SITE}/dashboard?page=shop`],
  ]),
};

/* ───────────── posting ───────────── */

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

async function publish(channelId, message, label) {
  const me = await call("GET", "/users/@me");
  const recent = await call("GET", `/channels/${channelId}/messages?limit=50`);
  const mine = recent.filter((m) => m.author.id === me.id);
  const payload = { ...message, content: "", allowed_mentions: { parse: [] } };
  if (mine.length === 1) {
    await call("PATCH", `/channels/${channelId}/messages/${mine[0].id}`, payload);
    console.log(`[updated] ${label}`);
    return;
  }
  for (const m of mine) await call("DELETE", `/channels/${channelId}/messages/${m.id}`);
  const sent = await call("POST", `/channels/${channelId}/messages`, payload);
  console.log(`[posted]  ${label} (${sent.id})`);
}

(async () => {
  await publish(CHANNEL_PRICING, pricing, "#pricing");
  await publish(CHANNEL_ROLES, roles, "#roles");
})().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
