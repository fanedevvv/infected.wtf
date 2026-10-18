import Link from "next/link";

const COLUMNS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Leaderboard", href: "/leaderboard" },
      { label: "Shop", href: "/dashboard?page=shop" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Get started", href: "/register" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Discord", href: "https://discord.gg/kPx9zWzWez", external: true },
      { label: "Partners", href: "/partners" },
      { label: "Support", href: "/support" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-card">
        <div className="footer-top">
          <div className="footer-intro">
            <div className="footer-brand">infected.wtf</div>
            <p>One link for every side of you. Free forever.</p>
          </div>
          <nav className="footer-cols" aria-label="Footer">
            {COLUMNS.map((col) => (
              <div key={col.title} className="footer-col">
                <div className="footer-col-title">{col.title}</div>
                {col.links.map((l) =>
                  l.external ? (
                    <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
                  ) : (
                    <Link key={l.label} href={l.href}>{l.label}</Link>
                  )
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="footer-wordmark" aria-hidden="true">INFECTED.WTF</div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} INFECTED.WTF</span>
          <span>Made for creators, gamers and communities.</span>
        </div>
      </div>
    </footer>
  );
}
