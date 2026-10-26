import Link from "next/link";
import InfectionField from "./InfectionField";
import { LabWordmark } from "./LabMark";

// Split-screen shell for every auth page: a living infection field on the left, the form on the right.
export default function LabAuth({
  kicker,
  title,
  description,
  sideTitle,
  children,
  alt,
  footer,
  wide,
}: {
  kicker: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  sideTitle?: React.ReactNode;
  children: React.ReactNode;
  alt?: { text: string; label: string; href: string };
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="la">
      <aside className="la-side" aria-hidden="true">
        <InfectionField className="la-field" cell={16} />
        <Link href="/" className="la-brand"><LabWordmark /></Link>
        <div className="la-side-title">{sideTitle ?? <>Quarantine<br />is <span className="is-accent">over.</span></>}</div>
        <div className="la-side-meta">
          <span>infected.wtf</span>
          <span>Bio links · Lab grade</span>
        </div>
      </aside>

      <main className="la-main">
        <div className="la-top">
          <Link href="/" className="la-brand la-brand--mobile"><LabWordmark /></Link>
          <Link href="/" className="la-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" width="13" height="13"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
            Home
          </Link>
          {alt && <span className="la-alt">{alt.text} <Link href={alt.href}>{alt.label}</Link></span>}
        </div>

        <div className={`la-card${wide ? " la-card--wide" : ""}`}>
          <span className="lab-label"><span className="lab-dot" /> {kicker}</span>
          <h1 className="la-title">{title}</h1>
          {description && <p className="la-desc">{description}</p>}
          <div className="la-body">{children}</div>
          {footer && <div className="la-foot">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
