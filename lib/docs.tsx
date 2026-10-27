import type { ReactNode } from "react";

// Content for docs.infected.wtf. Facts here mirror the code (prices in app/dashboard/shop, limits in lib/*):
// update this file whenever a price, limit or feature changes.

export type DocPage = {
  id: string;
  section: "Introduction" | "Account" | "Features" | "Support";
  title: string;
  summary: string;
  /** In-page headings for the "On this page" list; each needs a matching <H2 id>. */
  toc: { id: string; label: string }[];
  /** Extra words the search box should match. */
  keywords: string;
  body: ReactNode;
};

export const DISCORD_INVITE = "https://infected.wtf/discord";
export const SITE = "https://infected.wtf";

const H2 = ({ id, children }: { id: string; children: ReactNode }) => <h2 id={id}>{children}</h2>;

function Callout({ tone = "info", title, children }: { tone?: "info" | "tip" | "warn"; title: string; children: ReactNode }) {
  return (
    <div className={`dc-callout dc-callout--${tone}`}>
      <b>{title}</b>
      <div>{children}</div>
    </div>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="dc-steps">
      {items.map((item, i) => <li key={i}><span className="dc-step-n">{i + 1}</span><div>{item}</div></li>)}
    </ol>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="dc-table-wrap">
      <table className="dc-table">
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener" : undefined}>{children}</a>
);

export const DOC_PAGES: DocPage[] = [
  {
    id: "getting-started",
    section: "Introduction",
    title: "First Steps",
    summary: "What infected.wtf is and how to get your page live in a couple of minutes.",
    keywords: "welcome intro register signup create account verify email username login requirements browser",
    toc: [
      { id: "what-is", label: "What is infected.wtf?" },
      { id: "requirements", label: "Requirements" },
      { id: "create-account", label: "Create your account" },
      { id: "dashboard", label: "Your dashboard" },
      { id: "help", label: "Getting help" },
    ],
    body: (
      <>
        <H2 id="what-is">What is infected.wtf?</H2>
        <p>infected.wtf is a bio link platform: one short link (<code>infected.wtf/yourname</code>) that holds your socials, music, live Discord and Spotify status, games, projects and a fully customised look. Visitors land on your page, you see who came and from where.</p>
        <H2 id="requirements">Requirements</H2>
        <p>Everything runs in the browser — there is nothing to install. Any current version of Chrome, Firefox, Edge or Safari works, on desktop and on phones.</p>
        <H2 id="create-account">Create your account</H2>
        <p>Creating an account is free and needs no card.</p>
        <Steps items={[
          <>Go to <A href={`${SITE}/register`}>infected.wtf/register</A> and pick your username — it becomes your link, <code>infected.wtf/username</code>.</>,
          <>Enter your email and a password, and complete the quick human check.</>,
          <>Open the verification email and click the link. If it doesn&apos;t arrive, check spam, or use <b>Resend verification email</b> on the login page.</>,
          <>Log in and open <b>Customize</b> to start building your page.</>,
        ]} />
        <Callout tone="tip" title="Have a referral code?">Enter a friend&apos;s code (or their username) when registering — they earn tokens once you verify your email.</Callout>
        <H2 id="dashboard">Your dashboard</H2>
        <p>After logging in you land on the dashboard. The sidebar has everything: the <b>profile editor</b> (Customize), badges, links, projects, the image host, analytics, the shop, the daily spin and your settings. The language (English, Română, Русский) and the dashboard theme are switched from the top bar.</p>
        <H2 id="help">Getting help</H2>
        <p>Ask in the <A href={DISCORD_INVITE}>Discord server</A> — the team is active daily and the community helps too. Service status is always on <A href="https://status.infected.wtf">status.infected.wtf</A>.</p>
      </>
    ),
  },
  {
    id: "profile-setup",
    section: "Account",
    title: "Profile Setup",
    summary: "Avatar, banner, bio, links and the extras that make a page yours.",
    keywords: "avatar banner bio display name location job birthday links socials aliases best friend skills projects pages",
    toc: [
      { id: "editor", label: "The profile editor" },
      { id: "identity", label: "Avatar, banner & bio" },
      { id: "socials", label: "Social links" },
      { id: "extras", label: "Aliases, best friend & skills" },
      { id: "projects", label: "Projects" },
      { id: "pages", label: "Multiple pages" },
    ],
    body: (
      <>
        <H2 id="editor">The profile editor</H2>
        <p>Open <b>Customize</b> in the dashboard. The editor is a grid of tiles — Profile, Look, Background, Effects, Music, Links, Widgets, Badges, Aliases, Best Friend, Sharing and Skills. A live preview shows your page on desktop or phone as you edit; nothing is public until you press <b>Save changes</b>.</p>
        <H2 id="identity">Avatar, banner &amp; bio</H2>
        <Table head={["Field", "Limits"]} rows={[
          ["Avatar", "JPG, PNG, GIF or WebP, up to 5 MB. Animated GIFs stay animated."],
          ["Banner", "JPG, PNG or WebP, up to 8 MB. Shown across the top of your card."],
          ["Display name", "Up to 100 characters."],
          ["Bio", "Up to 300 characters, with optional text effects."],
          ["Location, job, birthday", "Optional. Your age is shown, never the full date."],
        ]} />
        <H2 id="socials">Social links</H2>
        <p>Add links to Instagram, X/Twitter, YouTube, TikTok, Twitch, GitHub, Steam, Spotify, Discord or any website from the <b>Widgets</b> tile. Each one appears as an icon button on your page, and every click is counted in your analytics.</p>
        <H2 id="extras">Aliases, best friend &amp; skills</H2>
        <ul>
          <li><b>Aliases</b> — extra names that redirect to your page (<code>infected.wtf/othername</code>). 3 aliases on the free plan, 10 with Infected Plus.</li>
          <li><b>Best friend</b> — feature one other profile on your page. They get a notification.</li>
          <li><b>Skills</b> — up to 20 skills shown as level bars on your card.</li>
        </ul>
        <H2 id="projects">Projects</H2>
        <p>Show off what you&apos;ve built from <b>Projects</b> in the sidebar: title, description, a project link, a repository link, up to 10 technologies and an image (JPG, PNG or WebP, max 2 MB). Projects are reviewed by the team first and appear on your page once approved. You can have up to 5 projects waiting for review at a time.</p>
        <H2 id="pages">Multiple pages</H2>
        <p>Each account has one page on the free plan and up to 3 with Infected Plus — handy for a personal page and a project or server page.</p>
      </>
    ),
  },
  {
    id: "plans",
    section: "Account",
    title: "Plans",
    summary: "Free vs Infected Plus, and what each one includes.",
    keywords: "free plus premium infected plus compare limits subscription lifetime",
    toc: [
      { id: "free", label: "Free" },
      { id: "plus", label: "Infected Plus" },
      { id: "compare", label: "Comparison" },
    ],
    body: (
      <>
        <H2 id="free">Free</H2>
        <p>Everything you need for a great page: the full profile editor, five layout templates, social links, Discord and Spotify widgets, game integrations, comments, your views chart, the image host and the daily spin.</p>
        <H2 id="plus">Infected Plus</H2>
        <p>Infected Plus is a one-time <b>€7 lifetime</b> purchase, or can be activated with tokens at <b>100 tokens per day</b>. It adds:</p>
        <ul>
          <li>The premium layouts — <b>Deck</b>, <b>Orbit</b>, <b>Terminal</b>, <b>Scrapbook</b>, <b>Hex Grid</b>, <b>Vinyl</b> and <b>Constellation</b>.</li>
          <li>The Infected Plus name glow and the Infected Plus badge.</li>
          <li>The Analytics page — views by country, browser, device and OS, and your top links.</li>
          <li>Higher token earnings: 5 tokens per profile view (instead of 3) and 20 per referral (instead of 10).</li>
          <li>Premium custom domains, 3 pages, 10 aliases and 2 GB of image storage.</li>
          <li>Gifting Infected Plus to friends with tokens.</li>
          <li>No &quot;INFECTED.WTF&quot; footer on your page.</li>
        </ul>
        <H2 id="compare">Comparison</H2>
        <Table head={["", "Free", "Infected Plus"]} rows={[
          ["Layout templates", "5", "8"],
          ["Pages per account", "1", "3"],
          ["Aliases", "3", "10"],
          ["Image host storage", "250 MB", "2 GB"],
          ["Tokens per profile view", "3", "5"],
          ["Tokens per referral", "10", "20"],
          ["Analytics page", "—", "✓"],
          ["Premium domains", "—", "✓"],
        ]} />
      </>
    ),
  },
  {
    id: "badges",
    section: "Account",
    title: "Badges",
    summary: "Every badge, how to get it, and how to show the ones you want.",
    keywords: "badge og verified hall of fame champion views master promoter elite discord booster shop known rich trapstar killer lover fresh staff",
    toc: [
      { id: "automatic", label: "Earned automatically" },
      { id: "shop", label: "Shop badges" },
      { id: "special", label: "Special & staff badges" },
      { id: "manage", label: "Showing and ordering" },
    ],
    body: (
      <>
        <H2 id="automatic">Earned automatically</H2>
        <Table head={["Badge", "How to get it"]} rows={[
          ["OG", "One of the first 1,000 accounts on the platform."],
          ["Hall of Fame", "Reach 1,000 profile views."],
          ["Champion", "Reach 10,000 profile views."],
          ["Views Master", "Be in the top 3 most-viewed profiles."],
          ["Discord", "Link your Discord account."],
          ["Server Booster", "Boost the infected.wtf Discord server."],
          ["Promoter", "Invite 10 people with your referral link."],
          ["Promoter Elite", "Invite 20 people."],
          ["Infected Plus", "Have an active Infected Plus subscription."],
        ]} />
        <H2 id="shop">Shop badges</H2>
        <p>Bought with tokens in the shop, yours forever:</p>
        <Table head={["Badge", "Price"]} rows={[
          ["Fresh", "50 tokens"], ["Known", "250 tokens"], ["Lover", "300 tokens"],
          ["Rich", "500 tokens"], ["Trapstar", "1,000 tokens"], ["The Killer", "1,500 tokens"],
        ]} />
        <p>The <b>Verified</b> badge (green checkmark) costs a one-time €5, or can be won on the daily spin.</p>
        <H2 id="special">Special &amp; staff badges</H2>
        <p>Crew, Billionaire, Content Creator and Designer are handed out by the team. Owner and Admin mark staff. Linked Discord accounts get matching roles in the Discord server automatically.</p>
        <H2 id="manage">Showing and ordering</H2>
        <p>In <b>Badges</b> you can hide any badge you own and drag them into the order you want — that order is used on your page and on your link embeds.</p>
      </>
    ),
  },
  {
    id: "integrations",
    section: "Account",
    title: "Integrations",
    summary: "Live Discord, Spotify, game and server cards on your page.",
    keywords: "discord presence server widget spotify now playing steam roblox minecraft server valorant twitch github",
    toc: [
      { id: "discord", label: "Discord" },
      { id: "spotify", label: "Spotify" },
      { id: "games", label: "Games & more" },
      { id: "privacy", label: "Visibility" },
    ],
    body: (
      <>
        <H2 id="discord">Discord</H2>
        <p><b>Connect Discord</b> to show your live presence — status, activity, badges and guild tag. You can also add your Discord server: paste its invite link and your page shows a server card with the live online and member count and a join button.</p>
        <Callout title="Presence needs the server">Live presence is read by the infected.wtf bot, so join the <A href={DISCORD_INVITE}>Discord server</A> for your status to show.</Callout>
        <H2 id="spotify">Spotify</H2>
        <p>Connect Spotify to show what you&apos;re listening to right now, with your recently played tracks when nothing is playing.</p>
        <H2 id="games">Games &amp; more</H2>
        <Table head={["Integration", "What it shows"]} rows={[
          ["Steam", "Your Steam profile."],
          ["Roblox", "Your Roblox profile."],
          ["Minecraft", "Your Minecraft player."],
          ["Minecraft server", "Live online status and player count of a server."],
          ["Valorant", "Your Valorant account."],
          ["Twitch", "Your channel."],
          ["GitHub", "Your profile and repositories."],
        ]} />
        <H2 id="privacy">Visibility</H2>
        <p>Every integration can be hidden from your page without disconnecting it, or removed completely, from the <b>Widgets</b> tile.</p>
      </>
    ),
  },
  {
    id: "customization",
    section: "Account",
    title: "Customization",
    summary: "Colors, layouts, fonts, backgrounds, music, effects and decorations.",
    keywords: "colors accent layout template font background video music cursor effects decorations avatar shape theme marketplace embed",
    toc: [
      { id: "look", label: "Colors & fonts" },
      { id: "layouts", label: "Layout templates" },
      { id: "background", label: "Background & music" },
      { id: "effects", label: "Effects & decorations" },
      { id: "themes", label: "Theme marketplace" },
    ],
    body: (
      <>
        <H2 id="look">Colors &amp; fonts</H2>
        <p>Set five colors — accent, background, name, bio and card overlay — and pick from 8 fonts (Syne, Outfit, Space Mono, Rajdhani, Orbitron, Bebas Neue, Exo 2, Josefin Sans). Card opacity and blur are adjustable too.</p>
        <H2 id="layouts">Layout templates</H2>
        <Table head={["Template", "Style", "Plan"]} rows={[
          ["Classic", "Centered, clean baseline", "Free"],
          ["Editorial", "Two columns, magazine feel", "Free"],
          ["Terminal", "Monospace hacker console", "Free"],
          ["Banner", "Tall hero banner, overlapping avatar", "Free"],
          ["Compact", "Small, dense card", "Free"],
          ["Aurora", "Oversized avatar with a glowing halo", "Plus"],
          ["Cinematic", "Full-bleed hero, avatar bottom-left", "Plus"],
          ["Dossier", "Wide identity card with corner brackets", "Plus"],
        ]} />
        <H2 id="background">Background &amp; music</H2>
        <p>Use a color, a gradient, an image or a video (MP4/WebM up to 100 MB) as your background. Add a profile track (MP3, OGG or WAV) with three player styles, and upload a custom cursor.</p>
        <H2 id="effects">Effects &amp; decorations</H2>
        <ul>
          <li><b>Text effects</b> for your name and bio — glow, rainbow, shake, glitch, scramble, shine, typewriter and flip.</li>
          <li><b>Avatar</b> — shapes (circle, rounded, square, heart, star, diamond and more).</li>
          <li><b>Shop effects</b> — cursor trails and animated backgrounds bought with tokens.</li>
          <li><b>Decorations</b> — 27 frames that sit on your avatar, from common to legendary. Win them on the daily spin or buy them in the shop.</li>
        </ul>
        <H2 id="themes">Theme marketplace</H2>
        <p>Publish your current look as a theme and sell it for 50–2,000 tokens; you keep 50% of every sale. Buyers can preview any theme on their own page before buying.</p>
      </>
    ),
  },
  {
    id: "analytics",
    section: "Features",
    title: "Analytics",
    summary: "Who visits your page, from where, and what they click.",
    keywords: "views visitors countries devices browsers os clicks stats leaderboard region",
    toc: [
      { id: "views", label: "How views are counted" },
      { id: "dashboard", label: "The analytics page" },
      { id: "leaderboard", label: "Leaderboard" },
    ],
    body: (
      <>
        <H2 id="views">How views are counted</H2>
        <p>A view is counted once per visitor per page — refreshing doesn&apos;t inflate it, and your own visits never count. Each view also earns you tokens (3, or 5 with Infected Plus).</p>
        <H2 id="dashboard">The analytics page</H2>
        <p>Everyone sees their total views, likes and a 30-day views chart on the dashboard home. The <b>Analytics</b> page is part of Infected Plus: views over time, top countries, devices, browsers, operating systems and your most-clicked links.</p>
        <H2 id="leaderboard">Leaderboard</H2>
        <p>The <A href={`${SITE}/leaderboard`}>leaderboard</A> ranks the most-viewed profiles. Set your country in Settings to also appear on your local leaderboard.</p>
      </>
    ),
  },
  {
    id: "domains",
    section: "Features",
    title: "Custom Domains",
    summary: "Use another domain for your link — same page, different address.",
    keywords: "domain custom url link vanity premium domains",
    toc: [
      { id: "how", label: "How domains work" },
      { id: "choose", label: "Choosing a domain" },
    ],
    body: (
      <>
        <H2 id="how">How domains work</H2>
        <p>Besides <code>infected.wtf</code>, your page can be reached on extra domains run by infected.wtf. Your page stays exactly the same — only the link changes, e.g. <code>otherdomain.tld/yourname</code>.</p>
        <H2 id="choose">Choosing a domain</H2>
        <p>Open the <b>Links</b> tile in the editor (or <b>Links</b> in the sidebar) and pick the domains you want your page on. Some domains are free for everyone; premium domains need Infected Plus.</p>
        <Callout title="Want your own domain?">Bringing your own domain isn&apos;t self-serve yet — ask in the <A href={DISCORD_INVITE}>Discord</A>.</Callout>
      </>
    ),
  },
  {
    id: "faq",
    section: "Support",
    title: "FAQ",
    summary: "Quick answers to the questions we get the most.",
    keywords: "faq questions verification email password 2fa delete account username change banned report comments tokens",
    toc: [
      { id: "account", label: "Account" },
      { id: "tokens", label: "Tokens" },
      { id: "safety", label: "Safety" },
    ],
    body: (
      <>
        <H2 id="account">Account</H2>
        <dl className="dc-faq">
          <dt>I never got the verification email.</dt>
          <dd>Check spam first. Then log in with your username and password — the login page offers <b>Resend verification email</b> (once a minute).</dd>
          <dt>Can I change my username?</dt>
          <dd>Yes, in Settings, once every 7 days.</dd>
          <dt>How do I secure my account?</dt>
          <dd>Turn on two-factor authentication with Google Authenticator in Settings. You can also review and end active sessions there.</dd>
          <dt>How do I delete my account?</dt>
          <dd>Settings → Delete Account. We email you a confirmation link; deletion is permanent.</dd>
        </dl>
        <H2 id="tokens">Tokens</H2>
        <dl className="dc-faq">
          <dt>How do I earn tokens?</dt>
          <dd>Profile views (3 each, 5 with Plus), referrals (10, or 20 with Plus), the daily spin, redeem codes, and selling themes on the marketplace. Token packs can also be bought.</dd>
          <dt>What can I spend them on?</dt>
          <dd>Badges, effects, decorations, themes, Infected Plus days, or sending tokens to friends (minimum 10).</dd>
        </dl>
        <H2 id="safety">Safety</H2>
        <dl className="dc-faq">
          <dt>Someone is impersonating me / posting something bad.</dt>
          <dd>Use <b>⚑ Report</b> at the bottom of their profile. Reports go straight to the staff.</dd>
          <dt>Can I remove comments on my page?</dt>
          <dd>Yes — you can delete any comment on your own page.</dd>
        </dl>
      </>
    ),
  },
  {
    id: "pricing",
    section: "Support",
    title: "Pricing & Plans",
    summary: "Everything that costs money, in one place.",
    keywords: "price pricing euro cost token packs verified plus lifetime payment",
    toc: [
      { id: "plans", label: "Plans" },
      { id: "packs", label: "Token packs" },
      { id: "extras", label: "One-time extras" },
    ],
    body: (
      <>
        <H2 id="plans">Plans</H2>
        <Table head={["Plan", "Price"]} rows={[
          ["Free", "€0, forever"],
          ["Infected Plus", "€7 one-time (lifetime), or 100 tokens per day"],
        ]} />
        <H2 id="packs">Token packs</H2>
        <Table head={["Pack", "Bonus", "Price"]} rows={[
          ["150 tokens", "—", "€0.99"],
          ["450 tokens", "—", "€2.99"],
          ["700 tokens", "+70", "€4.99"],
          ["1,500 tokens", "+150", "€8.99"],
          ["2,000 tokens", "+250", "€9.99"],
        ]} />
        <p>During x2 token events, every token pack gives double tokens.</p>
        <H2 id="extras">One-time extras</H2>
        <Table head={["Item", "Price"]} rows={[
          ["Verified badge", "€5"],
          ["Gift Infected Plus to someone", "€7, or tokens if you have Plus yourself"],
        ]} />
      </>
    ),
  },
  {
    id: "changelog",
    section: "Support",
    title: "Changelog",
    summary: "What's new on infected.wtf.",
    keywords: "changelog updates new release version",
    toc: [
      { id: "v2", label: "v2.0 — October 21, 2026" },
      { id: "oct-19", label: "October 18–19, 2026" },
    ],
    body: (
      <>
        <H2 id="v2">v2.0 — October 21, 2026</H2>
        <ul>
          <li>New tile-based <b>profile editor</b> with a live desktop/phone preview.</li>
          <li><b>Projects</b>, <b>aliases</b>, <b>best friend</b> and <b>skills</b> on profiles.</li>
          <li><b>Comments</b>, likes &amp; dislikes and profile reports.</li>
          <li><b>Image host</b> with short share links and Discord embeds.</li>
          <li>Dashboard in <b>English, Romanian and Russian</b>, plus dark/light themes and custom accent colors.</li>
          <li>Rich <b>link embeds</b> — your card, badges and colors when you share your link.</li>
          <li>Daily spin can now award <b>decorations</b>.</li>
          <li>Live status page at <A href="https://status.infected.wtf">status.infected.wtf</A> and these docs.</li>
        </ul>
        <H2 id="oct-19">October 18–19, 2026</H2>
        <ul>
          <li>New infected.wtf logo across the site.</li>
          <li>Redesigned transactional emails.</li>
        </ul>
      </>
    ),
  },
];

export const DOC_SECTIONS = ["Introduction", "Account", "Features", "Support"] as const;

export function findDoc(id: string | undefined) {
  return DOC_PAGES.find((p) => p.id === id) ?? DOC_PAGES[0];
}
