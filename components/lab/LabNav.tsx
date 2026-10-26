"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LabWordmark } from "./LabMark";
import { useScrolled } from "../useScrolled";

const LINKS = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/dashboard?page=shop", label: "Shop" },
  { href: "/partners", label: "Partners" },
  { href: "https://infected.wtf/discord", label: "Discord", external: true },
];

function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" width="13" height="13"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

export default function LabNav({ user }: { user?: { username: string } | null }) {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const scrolled = useScrolled();
  const pathname = usePathname();
  const close = () => setOpen(false);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const links = LINKS.map((l, i) => {
    const idx = <span className="lab-nav-idx">{String(i + 1).padStart(2, "0")}</span>;
    return l.external ? (
      <a key={l.href} href={l.href} target="_blank" rel="noreferrer" onClick={close}>{idx}{l.label}</a>
    ) : (
      <Link key={l.href} href={l.href} onClick={close} className={pathname === l.href ? "is-active" : undefined}>{idx}{l.label}</Link>
    );
  });

  const actions = user ? (
    <Link href="/dashboard" className="lab-btn lab-btn--solid" onClick={close}>Dashboard <Arrow /></Link>
  ) : (
    <>
      <Link href="/login" className="lab-btn lab-btn--ghost" onClick={close}>Log in</Link>
      <Link href="/register" className="lab-btn lab-btn--solid" onClick={close}>Get infected <Arrow /></Link>
    </>
  );

  return (
    <nav ref={navRef} className={`lab-nav${scrolled ? " is-scrolled" : ""}${open ? " is-open" : ""}`}>
      <div className="lab-nav-inner">
        <Link href="/" className="lab-nav-brand" onClick={close} aria-label="infected.wtf home"><LabWordmark /></Link>
        <div className="lab-nav-links">{links}</div>
        <div className="lab-nav-actions">{actions}</div>
        <button className="lab-nav-burger" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
          <span /><span />
        </button>
      </div>
      <div className="lab-nav-sheet">
        <div className="lab-nav-sheet-links">{links}</div>
        <div className="lab-nav-sheet-actions">{actions}</div>
      </div>
    </nav>
  );
}
