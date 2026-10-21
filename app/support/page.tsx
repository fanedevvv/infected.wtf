import PublicNavbar from "@/components/PublicNavbar";
import SiteFooter from "@/components/SiteFooter";
import CookieBanner from "@/components/CookieBanner";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCookieConsent } from "@/lib/cookie-consent";

const DiscordIcon = ({ size, fill }: { size: number; fill: string }) => (
  <svg viewBox="0 0 127.14 96.36" fill={fill} width={size} height={size}>
    <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z" />
  </svg>
);

export default async function SupportPage() {
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
            <DiscordIcon size={12} fill="currentColor" />
            Support
          </div>
          <h1 className="support-title">We&apos;re here to help</h1>
          <p className="support-sub">Join our Discord community for the fastest response &mdash; our team is active daily and the community is always ready to assist.</p>
        </div>

        <div className="discord-cta">
          <div className="discord-icon-wrap">
            <DiscordIcon size={38} fill="#fff" />
          </div>
          <div className="discord-cta-body">
            <div className="discord-cta-title">Join the INFECTED.WTF Discord</div>
            <div className="discord-cta-desc">Get help with your account, report bugs, suggest features, or just hang out with the community. Our developers are active and respond quickly.</div>
            <a href="https://discord.gg/kPx9zWzWez" target="_blank" rel="noopener noreferrer" className="discord-btn">
              <DiscordIcon size={16} fill="currentColor" />
              Join Discord Server
            </a>
          </div>
        </div>

        <div className="team-section">
          <div className="team-heading">Meet the Developers</div>
          <div className="team-grid">
            <div className="team-card">
              <div className="team-avatar team-avatar-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://cdn.discordapp.com/avatars/1443369756462944330/a_cf2b646b85b3e6fc50a9713d98ced037.gif" alt="FanE" />
              </div>
              <div>
                <div className="team-name">FanE</div>
                <div className="team-role">Developer</div>
                <span className="team-role-badge role-dev-fane">Developer</span>
              </div>
            </div>
            <div className="team-card">
              <div className="team-avatar team-avatar-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://cdn.discordapp.com/avatars/1232980258584793150/0dd417621c4806975bbbec88a1e37ff1.png?size=256" alt="vincenzoo$" />
              </div>
              <div>
                <div className="team-name">vincenzoo$</div>
                <div className="team-role">Developer</div>
                <span className="team-role-badge role-dev-fane">Developer</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
      <CookieBanner initialConsent={consent} />
    </>
  );
}
