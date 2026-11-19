// Posts (or updates in place) the bot's info messages: #pricing, #roles, #rules (mirrors app/rules/page.tsx) and #verify
// (its Verify button is handled in index.js, customId "infected:verify").
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
const CHANNEL_RULES = "1572169930835628135";
const CHANNEL_VERIFY = "1572922976783835278";
const CH = { chat: "1572865231762227220", news: "1572865070705418372", giveaways: "1572865177387532369", biolinks: "1572866741946810371" };
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
        `-# press Verify in <#${CHANNEL_VERIFY}> for ${R("INFECTED")} · linking your Discord adds ${R("DISCORD")}`,
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

/* ───────────── #rules ───────────── */

const rule = (emoji, n, title, body) => `${emoji} **${n}. ${title}**\n${body}`;

const rules = {
  embeds: [
    {
      color: COLOR,
      description: [
        `## ${E.inf_logo} INFECTED.WTF RULES`,
        "These rules apply **everywhere** on INFECTED.WTF — your profile, comments, the shop and this Discord server.",
        "Breaking them can get your profile suspended and you banned from Discord.",
        `${E.inf_link} **Bans are synced:** a ban on the site is a ban on Discord, and the other way around.`,
      ].join("\n"),
    },
    {
      color: COLOR,
      description: [
        rule(E.inf_users, 1, "Be Respectful", "Treat everyone with respect. Harassment, hate speech, discrimination, threats and targeted insults are not allowed — in chat, in profile comments, in bios or anywhere else."),
        rule(E.inf_ban, 2, "No NSFW or Illegal Content", "No NSFW, gore, shocking or illegal content. This includes:\n" + list([
          "Avatars, banners, backgrounds, cursors and profile music",
          "Usernames, display names and bios",
          "Links on your profile and messages on Discord",
        ])),
        rule(E.inf_warning, 3, "No Spam or Advertising", "Don't spam messages, comments, reactions or mentions. Don't advertise other servers, sites or services, and don't send unsolicited DMs to members — unless a channel is made for it."),
        rule(E.inf_badge, 4, "No Impersonation", "Don't pretend to be another person, creator, brand or a member of staff. Usernames and profiles made to look like someone else's will be removed."),
        rule(E.inf_shield, 5, "No Scams, Malware or Phishing", "Never share malware, phishing pages, IP grabbers, token loggers or scam links — on your profile or on Discord. This is an **instant, permanent ban** on both the site and Discord."),
      ].join("\n\n"),
    },
    {
      color: COLOR,
      description: [
        rule(E.inf_chart, 6, "No Botting or Abuse", "Play fair. The following are not allowed:\n" + list([
          "Botting or faking profile views, likes or comments",
          "Using alt accounts to farm tokens, referrals, badges or Discord invites",
          `Abusing bugs — report them on our [support page](${SITE}/support) instead`,
        ]) + "\nGains made this way are removed and the accounts involved can be suspended."),
        rule(E.inf_card, 7, "Payments & Tokens", `Payments for any benefit are made **only through the platform** or privately with the owners (${R("OWNER")}). We are not responsible for losses from deals made with anyone else.\nTokens have **no real-world value**: they can't be sold, traded, transferred between accounts or refunded. See our [Terms of Service](${SITE}/terms).`),
        rule(E.inf_eye, 8, "Privacy", "Don't share anyone's personal information (doxxing) — real names, addresses, photos, IPs or private conversations — without their permission. **Staff will never ask for your password.**"),
        rule(E.inf_check, 9, "Age & Discord Terms", "You must be at least **13 years old**. On this server you must also follow Discord's [Terms of Service](https://discord.com/terms) and [Community Guidelines](https://discord.com/guidelines)."),
        rule(E.inf_hammer, 10, "Staff & Punishments", "Follow staff instructions — their decisions are final. Depending on how serious a violation is, you can get:\n" + list([
          "A warning",
          "A timeout or mute on Discord",
          "Profile content removed or your profile suspended",
          "A permanent ban from the site and the Discord server",
        ]) + `\nThink a punishment was a mistake? Contact us via the [Support page](${SITE}/support).`),
      ].join("\n\n"),
      footer: { text: "By staying on this server you agree to these rules · Last updated: October 23, 2026" },
    },
  ],
  components: buttons([
    ["Full rules", `${SITE}/rules`],
    ["Terms of Service", `${SITE}/terms`],
    ["Support", `${SITE}/support`],
  ]),
};

/* ───────────── #verify ───────────── */

const emojiRef = (markup) => {
  const m = /<:(\w+):(\d+)>/.exec(markup || "");
  return m ? { name: m[1], id: m[2] } : undefined;
};

const verify = {
  embeds: [
    {
      color: COLOR,
      description: [
        `## ${E.inf_logo} WELCOME TO INFECTED.WTF`,
        `**One link that spreads every side of you** — bio pages, badges, effects and live Discord & Spotify widgets on [infected.wtf](${SITE}).`,
        "",
        `### ${E.inf_shield} Get access`,
        list([
          `Read the <#${CHANNEL_RULES}> — verifying means you agree to them`,
          `Press **Verify** below to get ${R("INFECTED")}`,
          "The whole server unlocks instantly",
        ]),
        "",
        `### ${E.inf_sparkle} Once you're in`,
        `${E.inf_users} Hang out in <#${CH.chat}> and show off your page in <#${CH.biolinks}>`,
        `${E.inf_gift} News in <#${CH.news}>, free stuff in <#${CH.giveaways}>`,
        `${E.inf_link} Link your Discord on the site — your grades show up as roles (<#${CHANNEL_ROLES}>)`,
        `${E.inf_token} Plans and token packs in <#${CHANNEL_PRICING}>`,
        "",
        `-# ${E.inf_warning} Staff will never DM you for your password or a payment.`,
      ].join("\n"),
      image: { url: `${SITE}/assets/img/discord-banner.jpg` },
      footer: { text: "INFECTED.WTF · get infected" },
    },
  ],
  components: [
    {
      type: 1,
      components: [
        { type: 2, style: 3, label: "Verify", custom_id: "infected:verify", emoji: emojiRef(E.inf_check) },
        { type: 2, style: 5, label: "Rules", url: `https://discord.com/channels/${process.env.DISCORD_GUILD_ID}/${CHANNEL_RULES}` },
        { type: 2, style: 5, label: "Website", url: SITE },
      ],
    },
  ],
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
  // Only the bot's own regular posts (type 0) — never system messages like "<bot> joined the server".
  const mine = recent.filter((m) => m.author.id === me.id && m.type === 0);
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
  await publish(CHANNEL_RULES, rules, "#rules");
  await publish(CHANNEL_VERIFY, verify, "#verify");
})().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
