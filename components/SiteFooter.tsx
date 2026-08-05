import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-left">
          <div className="site-footer-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/img/logo-icon.png" alt="" className="brand-logo-icon" style={{ height: 16 }} />
          </div>
          <span className="site-footer-copy">&copy; {new Date().getFullYear()} INFECTED.WTF</span>
        </div>
        <div className="site-footer-links">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/support">Support</Link>
        </div>
      </div>
    </footer>
  );
}
