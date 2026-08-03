import PublicNavbar from "@/components/PublicNavbar";
import SiteFooter from "@/components/SiteFooter";
import CookieBanner from "@/components/CookieBanner";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCookieConsent } from "@/lib/cookie-consent";

export default async function TermsPage() {
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId }, select: { username: true } }) : null;
  const consent = await getCookieConsent();
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      <PublicNavbar user={user} />
      <div className="legal-page fade-in">
        <a href="/" className="legal-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><polyline points="15 18 9 12 15 6" /></svg>
          Back to home
        </a>
        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-meta">Last updated: {today} &nbsp;&middot;&nbsp; Effective immediately</p>

        <div className="legal-highlight">
          By accessing or using GETFAME.WTF you agree to be bound by these Terms. Please read them carefully before creating an account.
        </div>

        <div className="legal-toc">
          <div className="legal-toc-title">Table of Contents</div>
          <ol>
            <li><a href="#s1">Acceptance of Terms</a></li>
            <li><a href="#s2">Eligibility</a></li>
            <li><a href="#s3">Account Responsibilities</a></li>
            <li><a href="#s4">Acceptable Use</a></li>
            <li><a href="#s5">Content Ownership</a></li>
            <li><a href="#s6">Tokens &amp; Virtual Currency</a></li>
            <li><a href="#s7">Termination</a></li>
            <li><a href="#s8">Disclaimers &amp; Limitations</a></li>
            <li><a href="#s9">Changes to Terms</a></li>
            <li><a href="#s10">Contact</a></li>
          </ol>
        </div>

        <div className="legal-divider" />

        <div className="legal-section" id="s1">
          <h2><span className="legal-num">1</span> Acceptance of Terms</h2>
          <p>By registering for or using GETFAME.WTF (&quot;Service&quot;, &quot;Platform&quot;, &quot;we&quot;, &quot;us&quot;), you agree to these Terms of Service and our <a href="/privacy">Privacy Policy</a>. If you do not agree, please do not use the Service.</p>
        </div>

        <div className="legal-section" id="s2">
          <h2><span className="legal-num">2</span> Eligibility</h2>
          <p>You must be at least 13 years old to use GETFAME.WTF. By using the Service you represent and warrant that you meet this age requirement and that you have the right, authority and capacity to agree to these Terms.</p>
        </div>

        <div className="legal-section" id="s3">
          <h2><span className="legal-num">3</span> Account Responsibilities</h2>
          <p>You are responsible for:</p>
          <ul>
            <li>Keeping your password confidential and secure.</li>
            <li>All activity that occurs under your account.</li>
            <li>Notifying us immediately of any unauthorized access at <a href="/support">our support page</a>.</li>
            <li>Providing accurate registration information.</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms.</p>
        </div>

        <div className="legal-section" id="s4">
          <h2><span className="legal-num">4</span> Acceptable Use</h2>
          <p>You agree <strong>not</strong> to use the Service to:</p>
          <ul>
            <li>Post content that is illegal, abusive, harassing, threatening, or discriminatory.</li>
            <li>Impersonate another person or entity.</li>
            <li>Distribute malware, spam or phishing content via your profile links.</li>
            <li>Attempt to gain unauthorized access to other accounts or our infrastructure.</li>
            <li>Scrape or harvest data from the platform without permission.</li>
            <li>Circumvent any security or access controls.</li>
          </ul>
          <p>Violations may result in immediate account suspension without notice.</p>
        </div>

        <div className="legal-section" id="s5">
          <h2><span className="legal-num">5</span> Content Ownership</h2>
          <p>You retain ownership of any content you upload (avatars, backgrounds, links). By uploading content you grant us a non-exclusive, worldwide, royalty-free license to display it as part of the Service.</p>
          <p>We do not claim ownership of your content and will not sell it to third parties.</p>
        </div>

        <div className="legal-section" id="s6">
          <h2><span className="legal-num">6</span> Tokens &amp; Virtual Currency</h2>
          <p>Tokens are a virtual in-platform currency with <strong>no real-world monetary value</strong>. They cannot be exchanged for cash, transferred between accounts, or refunded. We reserve the right to adjust token balances or pricing at any time.</p>
        </div>

        <div className="legal-section" id="s7">
          <h2><span className="legal-num">7</span> Termination</h2>
          <p>You may delete your account at any time via Dashboard &rarr; Settings. We may suspend or terminate your access at any time, for any reason, with or without notice, particularly in cases of Terms violations.</p>
        </div>

        <div className="legal-section" id="s8">
          <h2><span className="legal-num">8</span> Disclaimers &amp; Limitations</h2>
          <p>The Service is provided <strong>&quot;as is&quot;</strong> without warranties of any kind. We are not liable for any indirect, incidental or consequential damages arising from your use of the Service. We do not guarantee uninterrupted availability.</p>
        </div>

        <div className="legal-section" id="s9">
          <h2><span className="legal-num">9</span> Changes to Terms</h2>
          <p>We may update these Terms at any time. Continued use of the Service after changes constitutes your acceptance of the new Terms. We will note the effective date at the top of this page.</p>
        </div>

        <div className="legal-section" id="s10">
          <h2><span className="legal-num">10</span> Contact</h2>
          <p>If you have questions about these Terms, please reach us via the <a href="/support">Support page</a> or join our <a href="https://discord.gg/BAEpkJ62VM" target="_blank" rel="noopener noreferrer">Discord server</a>.</p>
        </div>
      </div>

      <SiteFooter />
      <CookieBanner initialConsent={consent} />
    </>
  );
}
