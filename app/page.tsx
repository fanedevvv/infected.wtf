import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import ParticleBackground from "@/components/ParticleBackground";
import SiteFooter from "@/components/SiteFooter";
import { FloatingNavbar, ClaimUsername, Faq } from "@/components/HomeInteractive";
import SafeImg from "@/components/SafeImg";
import CookieBanner from "@/components/CookieBanner";
import { getCookieConsent } from "@/lib/cookie-consent";

function fmtNum(n: number): string {
  if (n >= 1000000) return (Math.round((n / 1000000) * 10) / 10) + "M";
  if (n >= 1000) return Math.floor(n / 100) / 10 + "K";
  return String(n);
}

export default async function Home() {
  const user = await getCurrentUser();

  const [totalUsers, viewsAgg, totalPremium, marqueeUsers, spotlightUser] = await Promise.all([
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
    prisma.profile.findFirst({
      where: { user: { banned: false, emailVerified: true } },
      include: { user: { select: { id: true, username: true, isPremium: true } } },
      orderBy: { views: "desc" },
    }),
  ]);
  const totalViews = viewsAgg._sum.views ?? 0;
  const doubledMarquee = [...marqueeUsers, ...marqueeUsers];

  return (
    <>
      <canvas id="particle-canvas" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />
      <ParticleBackground />

      <FloatingNavbar>
        <Link href="/" className="navbar-brand">GETFAME.WTF</Link>
        <div className="navbar-links">
          <a href="https://discord.gg/BAEpkJ62VM" target="_blank" rel="noreferrer">Discord</a>
          <Link href="/leaderboard">Leaderboard</Link>
          {user ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-secondary btn-sm">Login</Link>
              <Link href="/register" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
        </div>
      </FloatingNavbar>

      <div className="hero fade-in">
        <h1>One profile.<br /><em>Endless identity.</em></h1>

        {!user && (
          <>
            <ClaimUsername />
            <div className="hero-perks">
              <span className="hero-perk">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12" /></svg>
                Free forever
              </span>
              <span className="hero-perk-dot" />
              <span className="hero-perk">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                Ready in 2 minutes
              </span>
              <span className="hero-perk-dot" />
              <span className="hero-perk">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                No credit card
              </span>
            </div>
          </>
        )}

        <div className="hero-btns">
          {user ? (
            <>
              <Link href="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
              <Link href={`/${user.username}`} className="btn btn-secondary">Open my profile</Link>
            </>
          ) : (
            <>
              <Link href="/register" className="btn btn-primary">Get started free</Link>
              <Link href="/login" className="btn btn-secondary">Sign in</Link>
            </>
          )}
        </div>
      </div>

      <div className="combined-frame fade-in">
        <div className="combined-inner">
          <div className="trust-card">
            <div className="trust-headline">
              More than <span>{fmtNum(totalUsers)}</span><br />people use GETFAME.WTF.
            </div>
            <div className="trust-stats">
              <div>
                <div className="trust-stat-label">Users</div>
                <div className="trust-stat-val">{fmtNum(totalUsers)}</div>
              </div>
              <div>
                <div className="trust-stat-label">Profile Views</div>
                <div className="trust-stat-val">{fmtNum(totalViews)}</div>
              </div>
              <div>
                <div className="trust-stat-label" style={{ color: "rgba(255,215,0,.7)" }}>Subscribers</div>
                <div className="trust-stat-val" style={{ color: "#ffd700" }}>{fmtNum(totalPremium)}</div>
              </div>
            </div>
          </div>

          {marqueeUsers.length > 0 && (
            <div className="marquee-wrap">
              <div style={{ position: "relative" }}>
                <div className="marquee-fade-l" />
                <div className="marquee-fade-r" />
                <div className="marquee-track">
                  {doubledMarquee.map((p, i) => (
                    <a key={i} href={`/${p.user.username}`} className="marquee-card" target="_blank" rel="noreferrer">
                      <SafeImg src={p.avatar ? `/${p.avatar}` : null} className="marquee-avatar" />

                      <div>
                        <div className="marquee-name">{p.displayName || p.user.username}</div>
                        <div className="marquee-slug">/{p.user.username}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {spotlightUser ? (
            <div className="spotlight-inline">
              <div className="spotlight-inline-glow" />
              <div className="spotlight-inline-avatar-wrap">
                <div className="spotlight-inline-ring" />
                <SafeImg src={spotlightUser.avatar ? `/${spotlightUser.avatar}` : null} className="spotlight-inline-avatar" />
              </div>
              <div className="spotlight-inline-info">
                <div className="spotlight-inline-label">Spotlight</div>
                <div className="spotlight-inline-badge-row">
                  <span className="spotlight-inline-live">
                    <span className="spotlight-inline-dot" />
                    #1 Global
                  </span>
                  {spotlightUser.user.isPremium && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", fontSize: ".6rem", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#ffd700", background: "rgba(255,215,0,.08)", border: "1px solid rgba(255,215,0,.2)", borderRadius: 99, padding: ".18rem .55rem" }}>
                      Premium
                    </span>
                  )}
                </div>
                <div className="spotlight-inline-name">{spotlightUser.displayName || spotlightUser.user.username}</div>
                <div className="spotlight-inline-handle">/{spotlightUser.user.username}</div>
                {spotlightUser.bio && <div className="spotlight-inline-bio">{spotlightUser.bio}</div>}
                <a href={`/${spotlightUser.user.username}`} className="spotlight-inline-cta" target="_blank" rel="noreferrer">
                  View Profile
                </a>
              </div>
              <div className="spotlight-inline-stats">
                <div className="spotlight-inline-views-num">{fmtNum(spotlightUser.views)}</div>
                <div className="spotlight-inline-views-label">Profile Views</div>
                <div className="spotlight-inline-rank">Global #1</div>
              </div>
            </div>
          ) : (
            <div className="spotlight-empty-inline">No profiles yet — be the first!</div>
          )}
        </div>
      </div>

      <section className="features-section fade-in">
        <div className="features-intro">
          <div className="features-intro-label">Simple &amp; Intuitive</div>
          <h2>Build a clean profile page <span>without the clutter.</span></h2>
          <p>Everything you need in one place — badges, music, links and analytics, ready in minutes.</p>
        </div>
        <div className="features-divider" />
        <div className="features-grid">
          <div className="feat-item">
            <div className="feat-item-top">
              <div className="feat-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.09 6.26L21 9.27l-5 4.87 1.18 6.88L12 17.77l-5.18 3.25L8 14.14 3 9.27l6.91-1.01L12 2z" /></svg></div>
              <div className="feat-title">Badges &amp; Shop</div>
            </div>
            <div className="feat-desc">Unlock showcase badges and spend your tokens on exclusive profile items.</div>
          </div>
          <div className="feat-item">
            <div className="feat-item-top">
              <div className="feat-icon" style={{ background: "rgba(255,0,255,.08)", borderColor: "rgba(255,0,255,.15)", color: "var(--accent2)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
              </div>
              <div className="feat-title">Colors &amp; Effects</div>
            </div>
            <div className="feat-desc">Customize fonts, title effects and background visuals to match your style.</div>
          </div>
          <div className="feat-item">
            <div className="feat-item-top">
              <div className="feat-icon" style={{ background: "rgba(255,180,0,.08)", borderColor: "rgba(255,180,0,.15)", color: "#fbbf24" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
              </div>
              <div className="feat-title">Avatars &amp; Media</div>
            </div>
            <div className="feat-desc">Upload your own avatar, background and audio to stand out instantly.</div>
          </div>
          <div className="feat-item">
            <div className="feat-item-top">
              <div className="feat-icon" style={{ background: "rgba(95,239,165,.08)", borderColor: "rgba(95,239,165,.15)", color: "#5fefa5" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
              </div>
              <div className="feat-title">Analytics</div>
            </div>
            <div className="feat-desc">Track views, clicks and countries from a simple, readable dashboard.</div>
          </div>
        </div>
      </section>

      <section className="pricing-section fade-in">
        <div className="pricing-heading-label">Pricing</div>
        <div className="pricing-heading">One-Time Payment, Lifetime Access</div>
        <div className="pricing-sub">Pay once, enjoy forever — no subscriptions, no hidden fees.</div>
        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="pricing-plan-top">
              <div className="pricing-plan-icon free-ico">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>
              </div>
              <div>
                <div className="pricing-plan-name">Free Plan</div>
                <div className="pricing-plan-tagline">Your biolink starts here.</div>
              </div>
            </div>
            <div className="pricing-price-block">
              <div className="pricing-price"><sup>€</sup>0</div>
              <div className="pricing-price-note">Free for everyone</div>
            </div>
            <div className="pricing-perks-label">Features</div>
            <div className="pricing-perks">
              <div className="pricing-perk">Unlimited links</div>
              <div className="pricing-perk">Profile Analytics</div>
              <div className="pricing-perk">Basic customizations</div>
              <div className="pricing-perk disabled">Extra customizations</div>
              <div className="pricing-perk disabled">Premium features</div>
            </div>
            <Link href="/register" className="pricing-cta free-btn">Get Started</Link>
          </div>

          <div className="pricing-card featured">
            <div className="pricing-badge hot">Most Popular</div>
            <div className="pricing-plan-top">
              <div className="pricing-plan-icon prem-ico">
                <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.25)" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <div className="pricing-plan-name">Premium Plan</div>
                <div className="pricing-plan-tagline">Unlock the full biolink experience.</div>
              </div>
            </div>
            <div className="pricing-price-block">
              <div className="pricing-price"><sup>€</sup>7</div>
              <div className="pricing-price-note">Lifetime · one-time payment</div>
            </div>
            <div className="pricing-perks-label">Features</div>
            <div className="pricing-perks">
              <div className="pricing-perk">Full Analytics dashboard</div>
              <div className="pricing-perk">Exclusive Diamond badge</div>
              <div className="pricing-perk">Visual Effects access</div>
              <div className="pricing-perk">Golden 3D avatar ring</div>
              <div className="pricing-perk">Double referral rewards (20 tokens)</div>
              <div className="pricing-perk">5 tokens per profile view (vs 3)</div>
              <div className="pricing-perk">Priority support</div>
              <div className="pricing-perk">Remove watermark from profile</div>
            </div>
            <Link href="/dashboard/shop" className="pricing-cta prem-btn">Learn more</Link>
          </div>

          <div className="pricing-card verified-card">
            <div className="pricing-badge extra">Extra</div>
            <div className="pricing-plan-top">
              <div className="pricing-plan-icon verif-ico">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
              </div>
              <div>
                <div className="pricing-plan-name">Verified Profile</div>
                <div className="pricing-plan-tagline">Stand out with an official badge.</div>
              </div>
            </div>
            <div className="pricing-price-block">
              <div className="pricing-price"><sup>€</sup>5</div>
              <div className="pricing-price-note">One-time · permanent</div>
            </div>
            <div className="pricing-perks-label">Features</div>
            <div className="pricing-perks">
              <div className="pricing-perk">Official green checkmark badge</div>
              <div className="pricing-perk">Visible on your public profile</div>
              <div className="pricing-perk">Permanent — one-time purchase</div>
              <div className="pricing-perk">Builds trust with your audience</div>
            </div>
            <Link href="/dashboard/shop" className="pricing-cta verif-btn">Learn more</Link>
          </div>
        </div>
      </section>

      <Faq />

      <SiteFooter />
      <CookieBanner initialConsent={await getCookieConsent()} />
    </>
  );
}
