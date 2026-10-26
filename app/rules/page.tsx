import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";
import SiteFooter from "@/components/SiteFooter";
import CookieBanner from "@/components/CookieBanner";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCookieConsent } from "@/lib/cookie-consent";

// Community rules for the platform and the Discord server. The Discord #rules embed mirrors these sections.
export default async function RulesPage() {
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId }, select: { username: true } }) : null;
  const consent = await getCookieConsent();

  return (
    <>
      <PublicNavbar user={user} />
      <div className="legal-page fade-in">
        <Link href="/" className="legal-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><polyline points="15 18 9 12 15 6" /></svg>
          Back to home
        </Link>
        <h1 className="legal-title">Rules</h1>
        <p className="legal-meta">Last updated: October 23, 2026 &nbsp;&middot;&nbsp; Applies to infected.wtf and our Discord server</p>

        <div className="legal-highlight">
          These rules apply everywhere on INFECTED.WTF — your profile, comments, the shop and our Discord server. Breaking them can get your profile suspended and you banned from Discord. Bans are synced: a ban on the site is a ban on Discord, and the other way around.
        </div>

        <div className="legal-toc">
          <div className="legal-toc-title">Table of Contents</div>
          <ol>
            <li><a href="#r1">Be Respectful</a></li>
            <li><a href="#r2">No NSFW or Illegal Content</a></li>
            <li><a href="#r3">No Spam or Advertising</a></li>
            <li><a href="#r4">No Impersonation</a></li>
            <li><a href="#r5">No Scams, Malware or Phishing</a></li>
            <li><a href="#r6">No Botting or Abuse</a></li>
            <li><a href="#r7">Payments &amp; Tokens</a></li>
            <li><a href="#r8">Privacy</a></li>
            <li><a href="#r9">Age &amp; Discord Terms</a></li>
            <li><a href="#r10">Staff &amp; Punishments</a></li>
          </ol>
        </div>

        <div className="legal-divider" />

        <div className="legal-section" id="r1">
          <h2><span className="legal-num">1</span> Be Respectful</h2>
          <p>Treat everyone with respect. Harassment, hate speech, discrimination, threats and targeted insults are not allowed — in chat, in profile comments, in bios or anywhere else.</p>
        </div>

        <div className="legal-section" id="r2">
          <h2><span className="legal-num">2</span> No NSFW or Illegal Content</h2>
          <p>No NSFW, gore, shocking or illegal content. This includes:</p>
          <ul>
            <li>Avatars, banners, backgrounds, cursors and profile music.</li>
            <li>Usernames, display names and bios.</li>
            <li>Links on your profile and messages on Discord.</li>
          </ul>
        </div>

        <div className="legal-section" id="r3">
          <h2><span className="legal-num">3</span> No Spam or Advertising</h2>
          <p>Don&apos;t spam messages, comments, reactions or mentions. Don&apos;t advertise other servers, sites or services, and don&apos;t send unsolicited DMs to members — unless a channel is made for it.</p>
        </div>

        <div className="legal-section" id="r4">
          <h2><span className="legal-num">4</span> No Impersonation</h2>
          <p>Don&apos;t pretend to be another person, creator, brand or a member of staff. Usernames and profiles made to look like someone else&apos;s will be removed.</p>
        </div>

        <div className="legal-section" id="r5">
          <h2><span className="legal-num">5</span> No Scams, Malware or Phishing</h2>
          <p>Never share malware, phishing pages, IP grabbers, token loggers or scam links — on your profile or on Discord. This is an instant, permanent ban on both the site and Discord.</p>
        </div>

        <div className="legal-section" id="r6">
          <h2><span className="legal-num">6</span> No Botting or Abuse</h2>
          <p>Play fair. The following are not allowed:</p>
          <ul>
            <li>Botting or faking profile views, likes or comments.</li>
            <li>Using alt accounts to farm tokens, referrals, badges or Discord invites.</li>
            <li>Abusing bugs — report them on our <Link href="/support">support page</Link> instead.</li>
          </ul>
          <p>Gains made this way are removed and the accounts involved can be suspended.</p>
        </div>

        <div className="legal-section" id="r7">
          <h2><span className="legal-num">7</span> Payments &amp; Tokens</h2>
          <p>Payments for any benefit are made <strong>only through the platform</strong> or privately with the owners. We are not responsible for losses from deals made with anyone else.</p>
          <p>Tokens have <strong>no real-world value</strong>: they can&apos;t be sold, traded, transferred between accounts or refunded. See our <Link href="/terms">Terms of Service</Link>.</p>
        </div>

        <div className="legal-section" id="r8">
          <h2><span className="legal-num">8</span> Privacy</h2>
          <p>Don&apos;t share anyone&apos;s personal information (doxxing) — real names, addresses, photos, IPs or private conversations — without their permission. Staff will never ask for your password.</p>
        </div>

        <div className="legal-section" id="r9">
          <h2><span className="legal-num">9</span> Age &amp; Discord Terms</h2>
          <p>You must be at least 13 years old. On our Discord server you must also follow Discord&apos;s <a href="https://discord.com/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="https://discord.com/guidelines" target="_blank" rel="noopener noreferrer">Community Guidelines</a>.</p>
        </div>

        <div className="legal-section" id="r10">
          <h2><span className="legal-num">10</span> Staff &amp; Punishments</h2>
          <p>Follow staff instructions — their decisions are final. Depending on how serious a violation is, you can get:</p>
          <ul>
            <li>A warning.</li>
            <li>A timeout or mute on Discord.</li>
            <li>Profile content removed or your profile suspended.</li>
            <li>A permanent ban from the site and the Discord server.</li>
          </ul>
          <p>Think a punishment was a mistake? Contact us via the <Link href="/support">Support page</Link> or our <a href="https://infected.wtf/discord" target="_blank" rel="noopener noreferrer">Discord server</a>.</p>
        </div>
      </div>

      <SiteFooter />
      <CookieBanner initialConsent={consent} />
    </>
  );
}
