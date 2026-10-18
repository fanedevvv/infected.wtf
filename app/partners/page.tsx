import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";
import SiteFooter from "@/components/SiteFooter";
import CookieBanner from "@/components/CookieBanner";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCookieConsent } from "@/lib/cookie-consent";

export default async function PartnersPage() {
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId }, select: { username: true } }) : null;
  const consent = await getCookieConsent();

  return (
    <>
      <PublicNavbar user={user} />
      <div className="support-page fade-in">
        <a href="/" className="legal-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><polyline points="15 18 9 12 15 6" /></svg>
          Back to home
        </a>

        <div className="support-header">
          <div className="support-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            Partners
          </div>
          <h1 className="support-title">Grow with INFECTED.WTF</h1>
          <p className="support-sub">Three real ways to earn tokens and grow your reach by partnering with the platform — no fine print, no fake payouts.</p>
        </div>

        <div className="int-grid" style={{ marginBottom: "2.5rem" }}>
          <div className="int-card" style={{ ["--int-color" as string]: "#7c3aed" }}>
            <div className="int-card-header">
              <div className="int-card-icon generic-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              </div>
              <div>
                <div className="int-card-title">Referral Program</div>
                <div className="int-card-subtitle">Invite friends, earn tokens</div>
              </div>
            </div>
            <p className="int-card-desc">Share your referral link. Every friend who signs up earns you <strong style={{ color: "#7c3aed" }}>10 tokens</strong> — or <strong style={{ color: "#ffd700" }}>20 tokens</strong> if you&apos;re Infected Plus. No cap on referrals.</p>
            <div className="int-card-footer">
              <Link href={user ? "/dashboard?page=referral" : "/register"} className="int-btn int-btn-primary">
                {user ? "Open my referral page" : "Sign up to get your link"}
              </Link>
            </div>
          </div>

          <div className="int-card" style={{ ["--int-color" as string]: "#a855f7" }}>
            <div className="int-card-header">
              <div className="int-card-icon generic-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
              </div>
              <div>
                <div className="int-card-title">Theme Marketplace</div>
                <div className="int-card-subtitle">Design, publish, get paid</div>
              </div>
            </div>
            <p className="int-card-desc">Publish your profile look as a Theme. Every time someone buys it, you keep <strong style={{ color: "#a855f7" }}>50% of the price in tokens</strong> — credited to your account instantly.</p>
            <div className="int-card-footer">
              <Link href={user ? "/dashboard?page=marketplace" : "/register"} className="int-btn int-btn-primary">
                {user ? "Open the Marketplace" : "Sign up to start selling"}
              </Link>
            </div>
          </div>

          <div className="int-card" style={{ ["--int-color" as string]: "#5865f2" }}>
            <div className="int-card-header">
              <div className="int-card-icon discord-icon">
                <svg viewBox="0 0 127.14 96.36" fill="currentColor" width="20" height="20"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z" /></svg>
              </div>
              <div>
                <div className="int-card-title">Community &amp; Creators</div>
                <div className="int-card-subtitle">Run a server or a channel?</div>
              </div>
            </div>
            <p className="int-card-desc">Got a Discord server, a stream, or a community you&apos;d like to partner with us? Reach out on our Discord and tell the team about your audience.</p>
            <div className="int-card-footer">
              <a href="https://discord.gg/kPx9zWzWez" target="_blank" rel="noopener noreferrer" className="int-btn int-btn-outline" style={{ ["--int-color" as string]: "#5865f2" }}>
                Message us on Discord
              </a>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
      <CookieBanner initialConsent={consent} />
    </>
  );
}
