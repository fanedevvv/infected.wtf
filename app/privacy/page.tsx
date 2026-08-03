import PublicNavbar from "@/components/PublicNavbar";
import SiteFooter from "@/components/SiteFooter";
import CookieBanner from "@/components/CookieBanner";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCookieConsent } from "@/lib/cookie-consent";

export default async function PrivacyPage() {
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId }, select: { username: true } }) : null;
  const consent = await getCookieConsent();
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="privacy-page">
      <PublicNavbar user={user} />
      <div className="legal-page fade-in">
        <a href="/" className="legal-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><polyline points="15 18 9 12 15 6" /></svg>
          Back to home
        </a>
        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-meta">Last updated: {today} &nbsp;&middot;&nbsp; We take your privacy seriously</p>

        <div className="legal-highlight">
          This policy explains what data GETFAME.WTF collects, how it is used, and your rights regarding that data.
        </div>

        <div className="legal-toc">
          <div className="legal-toc-title">Table of Contents</div>
          <ol>
            <li><a href="#p1">Information We Collect</a></li>
            <li><a href="#p2">How We Use Your Information</a></li>
            <li><a href="#p3">Data Storage &amp; Security</a></li>
            <li><a href="#p4">Cookies</a></li>
            <li><a href="#p5">Third-Party Services</a></li>
            <li><a href="#p6">Your Rights</a></li>
            <li><a href="#p7">Data Retention</a></li>
            <li><a href="#p8">Children&apos;s Privacy</a></li>
            <li><a href="#p9">Changes to This Policy</a></li>
            <li><a href="#p10">Contact</a></li>
          </ol>
        </div>

        <div className="legal-divider" />

        <div className="legal-section" id="p1">
          <h2><span className="legal-num">1</span> Information We Collect</h2>
          <p><strong>Account data:</strong> username, email address, and hashed password when you register.</p>
          <p><strong>Profile data:</strong> display name, bio, location, avatar, background, links, and any other content you choose to add to your profile.</p>
          <p><strong>Usage data:</strong> IP address hashes (not raw IPs) used to count unique profile views, browser type and general device information.</p>
          <p><strong>Cookies:</strong> session tokens and a &quot;remember me&quot; cookie for persistent login.</p>
        </div>

        <div className="legal-section" id="p2">
          <h2><span className="legal-num">2</span> How We Use Your Information</h2>
          <ul>
            <li>To provide and maintain the Service (account access, profile display).</li>
            <li>To count unique profile views and provide analytics to profile owners.</li>
            <li>To process token transactions within the platform.</li>
            <li>To detect, prevent and respond to fraud or abuse.</li>
            <li>To send important service-related communications (if applicable).</li>
          </ul>
          <p>We do <strong>not</strong> sell your data, serve third-party ads, or share your personal information with advertisers.</p>
        </div>

        <div className="legal-section" id="p3">
          <h2><span className="legal-num">3</span> Data Storage &amp; Security</h2>
          <p>Your data is stored on secured servers. Passwords are stored as <strong>bcrypt hashes</strong> &mdash; we never store plaintext passwords. IP addresses used for view counting are stored as one-way hashes and cannot be reversed.</p>
          <p>While we implement security best practices, no system is 100% secure. We cannot guarantee absolute security of your data.</p>
        </div>

        <div className="legal-section" id="p4">
          <h2><span className="legal-num">4</span> Cookies</h2>
          <p>We use only essential cookies:</p>
          <ul>
            <li><strong>Session cookie</strong> &mdash; keeps you logged in during a browser session.</li>
            <li><strong>remember_token</strong> &mdash; a persistent cookie set only if you choose &quot;Remember me&quot; at login.</li>
          </ul>
          <p>We do not use tracking, advertising, or analytics cookies.</p>
        </div>

        <div className="legal-section" id="p5">
          <h2><span className="legal-num">5</span> Third-Party Services</h2>
          <p>We load fonts from <strong>Google Fonts</strong> (fonts.googleapis.com). This may log your IP address per Google&apos;s own privacy policy. No other third-party services are embedded on the platform.</p>
          <p>Links you add to your profile point to external sites. We are not responsible for their privacy practices.</p>
        </div>

        <div className="legal-section" id="p6">
          <h2><span className="legal-num">6</span> Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access</strong> &mdash; view all information stored in your profile via the dashboard.</li>
            <li><strong>Correction</strong> &mdash; update your username, email and profile data at any time.</li>
            <li><strong>Deletion</strong> &mdash; permanently delete your account and all associated data via Dashboard &rarr; Settings.</li>
          </ul>
          <p>For requests that cannot be fulfilled through the dashboard, contact us via <a href="/support">Support</a>.</p>
        </div>

        <div className="legal-section" id="p7">
          <h2><span className="legal-num">7</span> Data Retention</h2>
          <p>We retain your data as long as your account is active. When you delete your account, all personal data (username, email, profile, uploaded files) is permanently removed from our systems within 24 hours. Anonymized aggregate statistics may be retained.</p>
        </div>

        <div className="legal-section" id="p8">
          <h2><span className="legal-num">8</span> Children&apos;s Privacy</h2>
          <p>The Service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such data, please <a href="/support">contact us</a> immediately.</p>
        </div>

        <div className="legal-section" id="p9">
          <h2><span className="legal-num">9</span> Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. The effective date at the top of this page will reflect the latest revision. Continued use of the Service after changes constitutes your acceptance of the updated policy.</p>
        </div>

        <div className="legal-section" id="p10">
          <h2><span className="legal-num">10</span> Contact</h2>
          <p>For privacy-related questions or data requests, please visit our <a href="/support">Support page</a> or join our <a href="https://discord.gg/BAEpkJ62VM" target="_blank" rel="noopener noreferrer">Discord server</a>.</p>
        </div>
      </div>

      <SiteFooter />
      <CookieBanner initialConsent={consent} />
    </div>
  );
}
