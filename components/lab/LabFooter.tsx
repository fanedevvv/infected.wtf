import Link from "next/link";
import { LabMark } from "./LabMark";

const COLUMNS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Leaderboard", href: "/leaderboard" },
      { label: "Shop", href: "/dashboard?page=shop" },
      { label: "Pricing", href: "/#dosage" },
      { label: "Get started", href: "/register" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Discord", href: "https://infected.wtf/discord", external: true },
      { label: "Partners", href: "/partners" },
      { label: "Support", href: "/support" },
      { label: "Docs", href: "https://docs.infected.wtf" },
      { label: "Status", href: "https://status.infected.wtf" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Rules", href: "/rules" },
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
];

export default function LabFooter() {
  return (
    <footer className="lab-footer">
      <div className="lab-hazard" aria-hidden="true" />
      <div className="lab-footer-inner">
        <div className="lab-footer-top">
          <div className="lab-footer-intro">
            <LabMark size={30} className="lab-footer-mark" />
            <p>One link that spreads every side of you. Free to catch, impossible to cure.</p>
          </div>
          <nav className="lab-footer-cols" aria-label="Footer">
            {COLUMNS.map((col) => (
              <div key={col.title} className="lab-footer-col">
                <div className="lab-label">{col.title}</div>
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
        <div className="lab-footer-word" aria-hidden="true">INFECTED</div>
        <div className="lab-footer-bottom">
          <span>&copy; {new Date().getFullYear()} infected.wtf</span>
          <span>Made for creators, gamers and communities.</span>
        </div>
      </div>
    </footer>
  );
}
