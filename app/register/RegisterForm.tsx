"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";

const STRENGTH_LEVELS = [
  { label: "Too short", color: "#ff4444", width: 10 },
  { label: "Very weak", color: "#ff6644", width: 20 },
  { label: "Weak", color: "#ff9900", width: 40 },
  { label: "Fair", color: "#ffcc00", width: 60 },
  { label: "Strong", color: "#66dd00", width: 80 },
  { label: "Very strong", color: "#00e676", width: 100 },
];

function getStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

declare global {
  interface Window {
    onTurnstileSuccess?: (token: string) => void;
    onTurnstileExpired?: () => void;
  }
}

export default function RegisterForm({ initialRef, initialUsername }: { initialRef: string; initialUsername: string }) {
  const [username, setUsername] = useState(initialUsername);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [shake, setShake] = useState(false);
  const [referralCode, setReferralCode] = useState(initialRef);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitSecs, setRateLimitSecs] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [turnstileToken, setTurnstileToken] = useState("");

  useEffect(() => {
    window.onTurnstileSuccess = (token: string) => setTurnstileToken(token);
    window.onTurnstileExpired = () => setTurnstileToken("");
  }, []);

  useEffect(() => {
    if (!success && !rateLimited) return;
    const iv = setInterval(() => {
      setResendCooldown((s) => Math.max(0, s - 1));
      setRateLimitSecs((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [success, rateLimited]);

  async function resend() {
    await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email: pendingEmail, password: "x", confirm: "x", terms: true, resendEmail: pendingEmail }),
    });
    setResendCooldown(60);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!terms) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, confirm, terms, referralCode, turnstileToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      if (data.rateLimited) {
        setPendingEmail(data.pendingEmail || email);
        setRateLimited(true);
        setRateLimitSecs(data.secsLeft || 0);
        return;
      }
      setSuccess(true);
      setPendingEmail(data.pendingEmail || email);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <canvas id="particle-canvas" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />
        <div className="modal-overlay">
          <div className="modal-card">
            <span className="modal-site">GETFAME.WTF</span>
            <div className="envelope-wrap">
              <div className="envelope-bg">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" /></svg>
              </div>
            </div>
            <h2 className="modal-title">Check your inbox</h2>
            <p className="modal-sub">
              We sent a verification link to<br />
              <span className="hl">{pendingEmail}</span><br />
              Click the link to activate your account.
            </p>
            <ul className="verify-checklist">
              <li><span className="check">✓</span> Open the email from <strong style={{ color: "var(--text)" }}>GETFAME.WTF</strong></li>
              <li><span className="check">✓</span> Click the <strong style={{ color: "var(--text)" }}>Verify My Email</strong> button inside</li>
              <li><span className="check">✓</span> Check your <strong style={{ color: "var(--text)" }}>spam / junk</strong> folder if needed</li>
            </ul>
            <div className="resend-wrap">
              Didn&apos;t get it?{" "}
              <button className="resend-btn" disabled={resendCooldown > 0} onClick={resend}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend email"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (rateLimited) {
    return (
      <div className="auth-page">
        <canvas id="particle-canvas" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />
        <div className="modal-overlay">
          <div className="modal-card">
            <span className="modal-site">GETFAME.WTF</span>
            <div className="ratelimit-icon">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ff8080" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <h2 className="modal-title red">Already registered!</h2>
            <p className="modal-sub">
              An account with <span className="hl-red">{pendingEmail}</span> already exists but is <strong style={{ color: "#ff8080" }}>not verified yet</strong>.<br /><br />
              {rateLimitSecs > 0 ? "A verification email was recently sent. Please wait before requesting another one." : "We just sent you a new verification link. Check your inbox!"}
            </p>
            {rateLimitSecs > 0 && (
              <div className="countdown-bar-wrap">
                <div className="countdown-bar-label">Wait <strong>{rateLimitSecs}</strong>s before resending</div>
                <div className="countdown-bar-track">
                  <div className="countdown-bar-fill" style={{ width: `${Math.round((rateLimitSecs / 60) * 100)}%` }} />
                </div>
              </div>
            )}
            <div className="modal-btn-row">
              {rateLimitSecs <= 0 ? (
                <Link href="/register" className="btn btn-primary btn-full" style={{ background: "linear-gradient(135deg,rgba(255,80,80,.2),rgba(255,80,80,.1))", border: "1px solid rgba(255,80,80,.35)", color: "#ff8080" }}>
                  Back to register
                </Link>
              ) : (
                <button disabled className="btn btn-primary btn-full" style={{ opacity: 0.5 }}>
                  Resend in {rateLimitSecs}s
                </button>
              )}
              <Link href="/login" className="btn btn-secondary btn-full">Sign in instead</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const strength = password ? STRENGTH_LEVELS[Math.min(getStrength(password), STRENGTH_LEVELS.length - 1)] : null;

  return (
    <div className="auth-page">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer strategy="afterInteractive" />
      <canvas id="particle-canvas" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />
      <div className="auth-card fade-in" style={{ position: "relative", zIndex: 1 }}>
        <div className="auth-logo">
          <h1>GETFAME.WTF</h1>
          <p>Create your free account</p>
        </div>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <div className="username-input-wrap">
              <span className="username-at">@</span>
              <input
                className="form-control username-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={30}
                autoComplete="username"
              />
            </div>
            <div className="username-preview">GETFAME.WTF/<span>{username || "username"}</span></div>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            {strength && (
              <div style={{ marginTop: 6 }}>
                <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${strength.width}%`, borderRadius: 4, background: strength.color, transition: "width .3s,background .3s" }} />
                </div>
                <div style={{ fontSize: ".72rem", marginTop: 4, fontWeight: 600, color: strength.color }}>{strength.label}</div>
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Confirm password</label>
            <input type="password" className="form-control" placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="form-group" style={{ marginBottom: ".85rem" }}>
            <label>Referral Code <span style={{ color: "rgba(255,255,255,.3)", fontSize: ".7em", textTransform: "none", fontWeight: 400 }}>(optional)</span></label>
            <input
              className="form-control"
              placeholder="Enter referral code or username"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              maxLength={20}
              style={{ fontFamily: "'Space Mono',monospace" }}
            />
          </div>

          <div className={`terms-wrap ${shake ? "shake" : ""}`} onClick={() => setTerms((t) => !t)}>
            <div className={`terms-box ${terms ? "checked" : ""}`}>
              {terms && (
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              )}
            </div>
            <div className="terms-text">
              I AGREE TO THE <Link href="/terms" target="_blank" onClick={(e) => e.stopPropagation()}>TERMS OF SERVICE</Link> AND{" "}
              <Link href="/privacy" target="_blank" onClick={(e) => e.stopPropagation()}>PRIVACY POLICY</Link>
            </div>
          </div>

          <div className="turnstile-wrap">
            <div className="cf-turnstile" data-sitekey="0x4AAAAAADVikD2YYYTsbrFd" data-callback="onTurnstileSuccess" data-expired-callback="onTurnstileExpired" data-theme="dark" />
          </div>

          <button type="submit" disabled={loading || !terms} className="btn btn-primary btn-full">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="auth-footer">Already have an account? <Link href="/login">Sign in</Link></div>
      </div>
    </div>
  );
}
