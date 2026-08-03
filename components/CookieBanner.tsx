"use client";

import { useEffect, useState } from "react";

const COOKIE_NAME = "site_cookie_consent";

function getConsent(): string | null {
  const match = document.cookie.match(new RegExp("(?:^|; )" + COOKIE_NAME + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function CookieBanner({ initialConsent }: { initialConsent: string | null }) {
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (initialConsent) return;
    if (getConsent()) return;
    setVisible(true);
  }, [initialConsent]);

  async function decide(accepted: boolean) {
    const value = accepted ? "accepted" : "rejected";
    setDismissing(true);
    setTimeout(() => setVisible(false), 260);
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
          We use cookies to improve your experience. By accepting, you agree to our <a href="/privacy">Privacy Policy</a>.
        </div>
      </div>
      <div className="cookie-actions">
        <button className="cookie-btn cookie-reject" onClick={() => decide(false)}>Reject</button>
        <button className="cookie-btn cookie-accept" onClick={() => decide(true)}>Accept</button>
      </div>
    </div>
  );
}
