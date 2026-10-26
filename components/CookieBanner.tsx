"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const COOKIE_NAME = "site_cookie_consent";

const noopSubscribe = () => () => {};

function getConsent(): string | null {
  const match = document.cookie.match(new RegExp("(?:^|; )" + COOKIE_NAME + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function CookieBanner({ initialConsent }: { initialConsent: string | null }) {
  // The browser cookie can be newer than what the server saw; on the server, assume a choice exists so nothing flashes.
  const storedConsent = useSyncExternalStore(noopSubscribe, getConsent, () => "unknown");
  const [closed, setClosed] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const visible = !initialConsent && !storedConsent && !closed;

  async function decide(accepted: boolean) {
    const value = accepted ? "accepted" : "rejected";
    setDismissing(true);
    setTimeout(() => setClosed(true), 260);
    try {
      await fetch("/api/cookie_consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: value }),
      });
    } catch {
      const exp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `${COOKIE_NAME}=${value}; expires=${exp}; path=/; SameSite=Lax`;
    }
  }

  if (!visible) return null;

  return (
    <div id="cookie-banner" style={dismissing ? { transition: "opacity .25s, transform .25s", opacity: 0, transform: "translateY(16px) scale(.96)" } : undefined}>
      <div className="cookie-icon">🍪</div>
      <div className="cookie-text">
        <div className="cookie-title">We use cookies</div>
        <div className="cookie-desc">
          We use cookies to improve your experience. By accepting, you agree to our <Link href="/privacy">Privacy Policy</Link>.
        </div>
      </div>
      <div className="cookie-actions">
        <button className="cookie-btn cookie-reject" onClick={() => decide(false)}>Reject</button>
        <button className="cookie-btn cookie-accept" onClick={() => decide(true)}>Accept</button>
      </div>
    </div>
  );
}
