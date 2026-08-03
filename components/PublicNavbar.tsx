"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function PublicNavbar({ user, active }: { user?: { username: string } | null; active?: "leaderboard" }) {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <nav className="navbar" ref={navRef}>
      <Link href="/" className="navbar-brand" onClick={close}>INFECTED.WTF</Link>

      <div className="navbar-links">
        <a href="https://discord.gg/BAEpkJ62VM" target="_blank" rel="noreferrer">Discord</a>
        <Link href="/leaderboard" style={active === "leaderboard" ? { color: "#fff", fontWeight: 600 } : undefined}>
          Leaderboard
        </Link>
        <Link href="/#pricing">Pricing</Link>
        {user ? (
          <Link href="/dashboard" className="btn btn-primary btn-sm">Dashboard</Link>
        ) : (
          <>
            <Link href="/login" className="btn btn-secondary btn-sm">Login</Link>
            <Link href="/register" className="btn btn-primary btn-sm">Register</Link>
          </>
        )}
      </div>

      <button className="navbar-burger" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="20" height="20">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      <div className={`navbar-mobile-menu ${open ? "open" : ""}`}>
        <a href="https://discord.gg/BAEpkJ62VM" target="_blank" rel="noreferrer" onClick={close}>Discord</a>
        <Link href="/leaderboard" onClick={close} style={active === "leaderboard" ? { color: "#fff", fontWeight: 600 } : undefined}>
          Leaderboard
        </Link>
        <Link href="/#pricing" onClick={close}>Pricing</Link>
        {user ? (
          <Link href="/dashboard" className="btn btn-primary btn-sm" onClick={close}>Dashboard</Link>
        ) : (
          <>
            <Link href="/login" className="btn btn-secondary btn-sm" onClick={close}>Login</Link>
            <Link href="/register" className="btn btn-primary btn-sm" onClick={close}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
