"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function FloatingNavbar({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    function onScroll() {
      if (!nav) return;
      if (window.scrollY > 60) {
        Object.assign(nav.style, {
          top: "14px", width: "calc(100% - 2.5rem)", maxWidth: "780px", borderRadius: "18px",
          background: "rgba(10,10,16,0.85)", backdropFilter: "blur(20px) saturate(160%)",
          border: "1px solid rgba(255,255,255,.13)", boxShadow: "0 8px 48px rgba(0,0,0,.55)",
        });
      } else {
        Object.assign(nav.style, {
          top: "0", width: "100%", maxWidth: "100%", borderRadius: "0",
          background: "transparent", backdropFilter: "none",
          border: "1px solid transparent", boxShadow: "none",
        });
      }
    }
    nav.style.cssText += ";position:fixed;left:50%;transform:translateX(-50%);z-index:999;transition:top .5s cubic-bezier(.4,0,.2,1),width .5s,max-width .5s,border-radius .5s,background .5s,backdrop-filter .5s,border-color .5s,box-shadow .5s";
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <nav className="navbar" ref={ref}>{children}</nav>;
}

export function ClaimUsername() {
  const router = useRouter();
  const [val, setVal] = useState("");
  function claim() {
    router.push(val.trim() ? `/register?u=${encodeURIComponent(val.trim())}` : "/register");
  }
  return (
    <div className="hero-claim">
      <span className="hero-claim-prefix">@</span>
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && claim()}
        placeholder="yourname"
        maxLength={30}
        autoComplete="off"
      />
      <button className="hero-claim-btn" onClick={claim}>Claim</button>
    </div>
  );
}

const FAQS: [string, string][] = [
  ["What is GETFAME.WTF?", "GETFAME.WTF is a modern bio link platform built for creators and communities. One link that holds everything — your socials, your story, your brand."],
  ["Is GETFAME.WTF free?", "Yes, completely free. No credit card required. Create your profile in seconds and start sharing it right away. You can start for free and upgrade to Premium anytime"],
  ["How fast is setup?", "Under 2 minutes. Pick a username, add your links, upload an avatar — and you're live."],
  ["Can I customize my profile?", "Absolutely. You can change fonts, background, accent colors, add visual effects, music, and even upload a custom cursor."],
  ["What links can I add?", "Any platform — Instagram, Discord, Steam, Spotify, TikTok, YouTube, GitHub, your own website, and many more."],
  ["What are tokens?", "Tokens are the in-platform currency. Earn or receive them to unlock exclusive perks in the shop."],
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="faq-section fade-in">
      <div className="faq-heading">Frequently Asked Questions</div>
      {FAQS.map(([q, a], i) => (
        <div key={i} className={`faq-item ${open === i ? "open" : ""}`}>
          <div className="faq-q" onClick={() => setOpen(open === i ? null : i)}>
            <span>{q}</span>
            <div className="faq-toggle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
          </div>
          <div className="faq-a">{a}</div>
        </div>
      ))}
    </section>
  );
}
