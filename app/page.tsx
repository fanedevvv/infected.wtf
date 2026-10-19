import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import SiteFooter from "@/components/SiteFooter";
import { FloatingNavbar, HomeNavLinks, ClaimUsername, Faq } from "@/components/HomeInteractive";
import SafeImg from "@/components/SafeImg";
import CookieBanner from "@/components/CookieBanner";
import Parallax from "@/components/Parallax";
import ScrollReveal from "@/components/ScrollReveal";
import SmoothScroll from "@/components/SmoothScroll";
import PlatformStrip from "@/components/PlatformStrip";
import CTAWithVerticalMarquee from "@/components/ui/cta-with-text-marquee";
import PixelCard from "@/components/ui/PixelCard";
import Plasma from "@/components/ui/Plasma";
import { getCookieConsent } from "@/lib/cookie-consent";

function fmtNum(n: number): string {
  if (n >= 1000000) return (Math.round((n / 1000000) * 10) / 10) + "M";
  if (n >= 1000) return Math.floor(n / 100) / 10 + "K";
  return String(n);
}

function PlanPerk({ children }: { children: React.ReactNode }) {
  return (
    <li className="plan-perk">
      <span className="plan-check">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="10" height="10"><polyline points="20 6 9 17 4 12" /></svg>
      </span>
      {children}
    </li>
  );
}

export default async function Home() {
  const user = await getCurrentUser();

  const [totalUsers, viewsAgg, totalPremium, marqueeUsers] = await Promise.all([
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
      include: { user: { select: { username: true } } },
      orderBy: { user: { createdAt: "desc" } },
      take: 24,
    }),
  ]);
  const totalViews = viewsAgg._sum.views ?? 0;

  const profileCount = marqueeUsers.length;
  const profileReel = profileCount ? Array.from({ length: Math.max(profileCount, 8) }, (_, i) => marqueeUsers[i % profileCount]) : [];

  return (
    <div className="lc-site">

      <FloatingNavbar>
        <Link href="/" className="navbar-brand">
          <span>infected.wtf</span>
        </Link>
        <HomeNavLinks user={user} />
      </FloatingNavbar>

      <section className="gx-hero">
        <div className="gx-grid" aria-hidden="true" />
        <div className="gx-plasma" aria-hidden="true">
          <Plasma
            color="#8b5cf6"
            speed={0.5}
            direction="forward"
            scale={1}
            twist={1.85}
            softness={0.55}
            shine={2.1}
            mouseInteractive={true}
            wave={0.5}
            brightness={0.65}
            grain={0.08}
            quality={0.75}
            fade={0.6}
          />
        </div>

        <div className="gx-hero-inner fade-in">
          <div className="gx-eyebrow seasonal-off">Bio links, reimagined.</div>
          <h1>One link for<br /><em>every side of you.</em></h1>
          <p className="gx-lead">Links, music, Discord status and effects on a single page — live in under two minutes.</p>
          {user ? (
            <div className="gx-btns">
              <Link href="/dashboard" className="gx-btn">Go to dashboard.</Link>
              <Link href={`/${user.username}`} className="gx-btn gx-btn--ghost">Open my profile.</Link>
            </div>
          ) : (
            <ClaimUsername />
          )}
        </div>

      </section>

      <PlatformStrip />

      <section className="ls ls--cta" id="mission" data-reveal>
        <CTAWithVerticalMarquee
          className="bg-transparent"
          title={<>Claim your corner of <em>the internet.</em></>}
          description={<>Join {fmtNum(totalUsers)} creators sharing their links, music, Discord presence and effects from one page. Free forever — or unlock Infected Plus once and keep it for life.</>}
          action={user ? <Link href="/dashboard" className="gx-btn">Go to dashboard.</Link> : <ClaimUsername />}
          items={profileReel.map((p, i) => (
            <a key={`${p.user.username}-${i}`} href={`/${p.user.username}`} className="cta-profile" tabIndex={i < profileCount ? 0 : -1}>
              <SafeImg src={p.avatar ? `/${p.avatar}` : null} className="cta-profile-avatar" />
              <span className="cta-profile-link"><span>infected.wtf/</span>{p.user.username}</span>
            </a>
          ))}
        />
      </section>

      <section className="count-sec" aria-label="infected.wtf in numbers">
        <div className="count-bg" aria-hidden="true" data-parallax="-0.08">{fmtNum(totalUsers)}</div>
        <div className="count-fg" data-reveal>
          <h2>
            {totalUsers.toLocaleString("en-US")} {totalUsers === 1 ? "person" : "people"} built their page here,{" "}
            <span>and the world has visited them {fmtNum(totalViews)} times.</span>
          </h2>
          <div className="count-meta">
            <div><strong>{totalPremium.toLocaleString("en-US")}</strong> Infected Plus members.</div>
            <div><strong>{fmtNum(totalViews)}</strong> profile views.</div>
            <div><strong>€0</strong> to get started.</div>
          </div>
        </div>
      </section>

      <section className="ls" id="pricing">
        <header className="ls-head" data-reveal>
          <h2>One-time payment, lifetime access.</h2>
        </header>
        <div data-reveal>
        <div className="plans">
          <PixelCard className="plan-pixel" colors={["#f8fafc", "#e2e0ea", "#a6a3b8"]} glowColor="#a6a3b8" gap={6} speed={30} opacity={0.35} fade={0.7} radius={22}>
          <div className="plan">
            <div className="plan-kicker">Basic.</div>
            <div className="plan-price"><span className="plan-cur">€</span>0</div>
            <div className="plan-desc">Everything you need to get your page live.</div>
            <ul className="plan-perks">
              {["Your own infected.wtf/ link.", "Unlimited links.", "Basic profile analytics.", "Basic customizations."].map((t) => <PlanPerk key={t}>{t}</PlanPerk>)}
            </ul>
            <Link href="/register" className="plan-cta plan-cta--ghost">Get started. <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></Link>
          </div>
          </PixelCard>

          <PixelCard className="plan-pixel plan-pixel--plus" colors={["#ede9fe", "#c4b5fd", "#8b5cf6"]} glowColor="#8b5cf6" gap={5} speed={35} opacity={0.4} fade={0.7} radius={22} introDelay={150}>
          <div className="plan plan--plus">
            <div className="plan-kicker">Infected Plus. <span className="plan-tag">Most popular.</span></div>
            <div className="plan-price"><span className="plan-cur">€</span>7<span className="plan-per">one-time.</span></div>
            <div className="plan-desc">One payment, every effect, layout and perk — for life.</div>
            <ul className="plan-perks">
              {["Everything in basic.", "Full analytics dashboard.", "Visual effects & exclusive layouts.", "Golden avatar ring & diamond badge.", "More tokens per view & referral.", "No watermark & priority support."].map((t) => <PlanPerk key={t}>{t}</PlanPerk>)}
            </ul>
            <Link href="/dashboard?page=shop" className="plan-cta">Unlock Infected Plus. <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></Link>
          </div>
          </PixelCard>
        </div>
        </div>
      </section>

      <Faq />

      <SiteFooter />
      <Parallax />
      <ScrollReveal />
      <SmoothScroll />
      <CookieBanner initialConsent={await getCookieConsent()} />
    </div>
  );
}
