import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import LabNav from "@/components/lab/LabNav";
import LabFooter from "@/components/lab/LabFooter";
import InfectionField from "@/components/lab/InfectionField";
import HeroClaim from "@/components/lab/HeroClaim";
import CountUp from "@/components/lab/CountUp";
import SafeImg from "@/components/SafeImg";
import CookieBanner from "@/components/CookieBanner";
import ScrollReveal from "@/components/ScrollReveal";
import PlatformStrip from "@/components/PlatformStrip";
import { getCookieConsent } from "@/lib/cookie-consent";

const SYMPTOMS: { title: string; body: string; tier: "Free" | "Plus" | "Free + Plus" }[] = [
  { title: "Links", body: "Unlimited links to every platform, with click tracking on each one.", tier: "Free" },
  { title: "Presence", body: "Live Discord status, Spotify now-playing, Steam, Roblox, Valorant and more.", tier: "Free" },
  { title: "Sound", body: "A music player with real artwork and synced lyrics that plays when people land.", tier: "Free" },
  { title: "Mutations", body: "Effects, custom cursors, layouts, avatar decorations and fonts.", tier: "Free + Plus" },
  { title: "Telemetry", body: "Views, clicks, referrers and countries — every visit, charted.", tier: "Free + Plus" },
  { title: "Colony", body: "Badges, the leaderboard, comments, referrals and a token economy.", tier: "Free" },
];

const FAQS: [string, string][] = [
  ["What is infected.wtf?", "A bio link platform for creators and communities. One link that holds everything — your socials, your music, your status and your style."],
  ["Is it free?", "Yes. No card, no trial. Make your page in seconds and keep it forever. Infected Plus is an optional one-time upgrade."],
  ["How fast is setup?", "About two minutes. Pick a name, add your links, upload an avatar — you're live."],
  ["How far can I customize it?", "Fonts, backgrounds, accent colours, layouts, effects, music, cursors, decorations and widgets."],
  ["Which links can I add?", "Any platform — Instagram, Discord, Steam, Spotify, TikTok, YouTube, GitHub, your own site and many more."],
  ["What are tokens?", "The in-platform currency. Earn them from views, referrals and the daily spin, and spend them in the shop."],
];

function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" width="14" height="14"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

export default async function Home() {
  const user = await getCurrentUser();

  const [totalUsers, viewsAgg, totalPremium, recent] = await Promise.all([
    prisma.user.count({ where: { emailVerified: true } }),
    prisma.profile.aggregate({ _sum: { views: true } }),
    prisma.user.count({
      where: {
        isPremium: true,
        emailVerified: true,
        OR: [{ premiumExpiresAt: null }, { premiumExpiresAt: { gt: new Date() } }],
      },
    }),
    prisma.profile.findMany({
      where: { user: { banned: false, emailVerified: true } },
      include: { user: { select: { username: true, id: true } } },
      orderBy: { user: { createdAt: "desc" } },
      take: 12,
    }),
  ]);
  const totalViews = viewsAgg._sum.views ?? 0;

  return (
    <div className="lab-page lx">
      <LabNav user={user} />

      <section className="lx-hero">
        <InfectionField className="lx-field" />
        <div className="lab-wrap">
          {user ? (
            <div className="lx-hero-grid lx-hero-grid--user">
              <div className="lx-hero-copy">
                <div className="lab-label lx-hero-tag"><span className="lab-dot" /> Welcome back, host</div>
                <h1 className="lx-hero-title">
                  <span>Still</span>
                  <span className="is-accent">contagious,</span>
                  <span>{user.username}.</span>
                </h1>
                <div className="lx-hero-btns">
                  <Link href="/dashboard" className="lab-btn lab-btn--solid lab-btn--lg">Open dashboard <Arrow /></Link>
                  <Link href={`/${user.username}`} className="lab-btn lab-btn--ghost lab-btn--lg">View my page</Link>
                </div>
              </div>
            </div>
          ) : (
            <HeroClaim specimenNo={totalUsers + 1} />
          )}
        </div>
        <div className="lx-hero-rail" aria-hidden="true">
          <span>Move your cursor — it spreads</span>
          <span>{totalUsers.toLocaleString("en-US")} hosts / {totalViews.toLocaleString("en-US")} exposures</span>
        </div>
      </section>

      <div className="lx-vectors">
        <div className="lab-label">Transmission vectors</div>
        <PlatformStrip />
      </div>

      <section className="lx-sec" id="outbreak">
        <div className="lab-wrap">
          <header className="lx-head" data-reveal>
            <span className="lab-label">01 / Outbreak status</span>
            <h2>It&apos;s already <em>spreading.</em></h2>
          </header>
          <div className="lx-stats" data-reveal>
            <div className="lx-stat">
              <div className="lx-stat-n"><CountUp value={totalUsers} format="full" /></div>
              <div className="lx-stat-l">Hosts infected</div>
              <div className="lx-stat-bar"><i style={{ width: "100%" }} /></div>
            </div>
            <div className="lx-stat">
              <div className="lx-stat-n"><CountUp value={totalViews} format="compact" /></div>
              <div className="lx-stat-l">Profile exposures</div>
              <div className="lx-stat-bar"><i style={{ width: "78%" }} /></div>
            </div>
            <div className="lx-stat">
              <div className="lx-stat-n"><CountUp value={totalPremium} format="full" /></div>
              <div className="lx-stat-l">Mutated to Plus</div>
              <div className="lx-stat-bar"><i style={{ width: totalUsers ? `${Math.max(4, Math.round((totalPremium / totalUsers) * 100))}%` : "4%" }} /></div>
            </div>
            <div className="lx-stat">
              <div className="lx-stat-n">€0</div>
              <div className="lx-stat-l">To catch it</div>
              <div className="lx-stat-bar"><i style={{ width: "0%" }} /></div>
            </div>
          </div>
        </div>
      </section>

      <section className="lx-sec" id="symptoms">
        <div className="lab-wrap">
          <header className="lx-head" data-reveal>
            <span className="lab-label">02 / Symptoms</span>
            <h2>What your page <em>catches.</em></h2>
          </header>
          <ol className="lx-symptoms" data-reveal>
            {SYMPTOMS.map((s, i) => (
              <li key={s.title} className="lx-symptom">
                <span className="lx-symptom-n">{String(i + 1).padStart(2, "0")}</span>
                <span className="lx-symptom-t">{s.title}</span>
                <span className="lx-symptom-b">{s.body}</span>
                <span className="lx-symptom-tier">{s.tier}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {recent.length > 0 && (
        <section className="lx-sec" id="specimens">
          <div className="lab-wrap">
            <header className="lx-head lx-head--row" data-reveal>
              <div>
                <span className="lab-label">03 / Latest specimens</span>
                <h2>Freshly <em>infected.</em></h2>
              </div>
              <Link href="/leaderboard" className="lab-btn lab-btn--ghost">Full leaderboard <Arrow /></Link>
            </header>
            <div className="lx-specimens" data-reveal>
              {recent.map((p) => (
                <a key={p.user.username} href={`/${p.user.username}`} className="lx-tag">
                  <SafeImg src={p.avatar ? `/${p.avatar}` : null} className="lx-tag-avatar" />
                  <span className="lx-tag-info">
                    <span className="lx-tag-name">{p.displayName || p.user.username}</span>
                    <span className="lx-tag-url">/{p.user.username}</span>
                  </span>
                  <span className="lx-tag-id">#{String(p.user.id).padStart(5, "0")}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="lx-sec" id="dosage">
        <div className="lab-wrap">
          <header className="lx-head" data-reveal>
            <span className="lab-label">04 / Dosage</span>
            <h2>Pay once. <em>Stay infected.</em></h2>
          </header>
          <div className="lx-doses" data-reveal>
            <div className="lx-dose">
              <div className="lx-dose-top">
                <span className="lab-label">Strain / Base</span>
                <div className="lx-dose-price">€0</div>
                <p>Everything you need to get your page live.</p>
              </div>
              <ul className="lx-dose-list">
                {["Your own infected.wtf/ link", "Unlimited links", "Basic analytics", "Core customization"].map((t) => <li key={t}>{t}</li>)}
              </ul>
              <Link href="/register" className="lab-btn lab-btn--ghost lab-btn--block">Get started <Arrow /></Link>
            </div>
            <div className="lx-dose lx-dose--plus">
              <div className="lx-dose-top">
                <span className="lab-label">Strain / Plus <b>Most caught</b></span>
                <div className="lx-dose-price">€7<small>one-time</small></div>
                <p>One payment. Every effect, layout and perk — for life.</p>
              </div>
              <ul className="lx-dose-list">
                {["Everything in Base", "Full analytics dashboard", "Visual effects & exclusive layouts", "Diamond badge & Plus name glow", "More tokens per view & referral", "No watermark, priority support"].map((t) => <li key={t}>{t}</li>)}
              </ul>
              <Link href="/dashboard?page=shop" className="lab-btn lab-btn--solid lab-btn--block">Unlock Infected Plus <Arrow /></Link>
              <div className="lx-dose-code" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      <section className="lx-sec" id="faq">
        <div className="lab-wrap lx-faq-wrap">
          <header className="lx-head" data-reveal>
            <span className="lab-label">05 / Field notes</span>
            <h2>Questions, <em>answered.</em></h2>
            <p className="lx-head-sub">
              Still unsure? Ask us on <a href="https://infected.wtf/discord" target="_blank" rel="noreferrer">Discord</a>.
            </p>
          </header>
          <div className="lx-faq" data-reveal>
            {FAQS.map(([q, a], i) => (
              <details key={q} className="lx-faq-item">
                <summary><span className="lx-faq-n">Q.{String(i + 1).padStart(2, "0")}</span>{q}<span className="lx-faq-x" aria-hidden="true" /></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="lx-final">
        <div className="lab-wrap">
          <h2>Spread <em>yourself.</em></h2>
          <Link href={user ? "/dashboard" : "/register"} className="lab-btn lab-btn--solid lab-btn--lg">
            {user ? "Open dashboard" : "Claim your link"} <Arrow />
          </Link>
        </div>
      </section>

      <LabFooter />
      <ScrollReveal />
      <CookieBanner initialConsent={await getCookieConsent()} />
    </div>
  );
}
