"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Faqs02 from "@/components/ui/faqs-02";
import { useScrolled } from "./useScrolled";

export function FloatingNavbar({ children }: { children: React.ReactNode }) {
  const scrolled = useScrolled();
  return <nav className={`navbar navbar-public${scrolled ? " is-scrolled" : ""}`}>{children}</nav>;
}

export function HomeNavLinks({ user }: { user?: { username: string } | null }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <>
      <div className="navbar-links">
        <Link href="/leaderboard">Leaderboard</Link>
        <Link href="/dashboard?page=shop">Shop</Link>
        <Link href="/partners">Partners</Link>
        <a href="https://infected.wtf/discord" target="_blank" rel="noreferrer">Discord</a>
      </div>

      <div className="navbar-actions">
        {user ? (
          <Link href="/dashboard" className="btn btn-primary btn-sm">Dashboard</Link>
        ) : (
          <>
            <Link href="/login" className="btn btn-secondary btn-sm">Login</Link>
            <Link href="/register" className="btn btn-primary btn-sm navbar-signup">Get started<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></Link>
          </>
        )}
      </div>

      <div ref={wrapRef} className="navbar-burger-wrap">
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
          <Link href="/leaderboard" onClick={close}>Leaderboard</Link>
          <Link href="/dashboard?page=shop" onClick={close}>Shop</Link>
          <Link href="/partners" onClick={close}>Partners</Link>
          <a href="https://infected.wtf/discord" target="_blank" rel="noreferrer" onClick={close}>Discord</a>
          {user ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm" onClick={close}>Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-secondary btn-sm" onClick={close}>Login</Link>
              <Link href="/register" className="btn btn-primary btn-sm" onClick={close}>Register</Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function ClaimUsername() {
  const router = useRouter();
  const [val, setVal] = useState("");
  function claim() {
    router.push(val.trim() ? `/register?u=${encodeURIComponent(val.trim())}` : "/register");
  }
  return (
    <div className="hero-claim">
      <span className="hero-claim-prefix">infected.wtf/</span>
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && claim()}
        placeholder="yourname"
        maxLength={30}
        autoComplete="off"
      />
      <button className="hero-claim-btn" onClick={claim}>Claim it. <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></button>
    </div>
  );
}

const FAQS: [string, string][] = [
  ["What is INFECTED.WTF?", "INFECTED.WTF is a modern bio link platform built for creators and communities. One link that holds everything — your socials, your story, your brand."],
  ["Is INFECTED.WTF free?", "Yes, completely free. No credit card required. Create your profile in seconds and start sharing it right away. You can start for free and upgrade to Infected Plus anytime."],
  ["How fast is setup?", "Under 2 minutes. Pick a username, add your links, upload an avatar — and you're live."],
  ["Can I customize my profile?", "Absolutely. You can change fonts, background, accent colors, add visual effects, music, and even upload a custom cursor."],
  ["What links can I add?", "Any platform — Instagram, Discord, Steam, Spotify, TikTok, YouTube, GitHub, your own website, and many more."],
  ["What are tokens?", "Tokens are the in-platform currency. Earn or receive them to unlock exclusive perks in the shop."],
];

export function Faq() {
  return (
    <Faqs02
      className="faq-sec"
      label="FAQ."
      title="Frequently asked questions."
      faqs={FAQS.map(([q, a]) => ({ q, a }))}
      description={
        <>
          Can&apos;t find what you&apos;re looking for? Ask us on{" "}
          <a href="https://infected.wtf/discord" target="_blank" rel="noreferrer" className="font-medium text-foreground underline-offset-4 hover:underline">Discord</a>.
        </>
      }
    />
  );
}
