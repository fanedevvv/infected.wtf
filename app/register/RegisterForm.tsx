"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import LabAuth from "@/components/lab/LabAuth";

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
    if (!turnstileToken) {
      setError("Please complete the verification challenge below.");
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
      <LabAuth kicker="Sample sent" title={<>Check your <span className="is-accent">inbox.</span></>} sideTitle={<>Almost<br /><span className="is-accent">infected.</span></>}>
        <p className="la-desc">
          We sent a verification link to <span className="la-hl">{pendingEmail}</span>. Click it to activate your account.
        </p>
        <ol className="la-steps">
          <li>Open the email from <strong>infected.wtf</strong></li>
          <li>Click the <strong>Verify my email</strong> button inside</li>
          <li>Check your <strong>spam / junk</strong> folder if needed</li>
        </ol>
        <div className="la-resend">
          Didn&apos;t get it?{" "}
          <button className="la-link-btn" disabled={resendCooldown > 0} onClick={resend}>
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend email"}
          </button>
        </div>
      </LabAuth>
    );
  }

  if (rateLimited) {
    return (
      <LabAuth kicker="Already registered" title={<>Pending <span className="is-hazard">verification.</span></>}>
        <p className="la-desc">
          An account with <span className="la-hl">{pendingEmail}</span> already exists but is not verified yet.{" "}
          {rateLimitSecs > 0 ? "A verification email was recently sent. Please wait before requesting another one." : "We just sent you a new verification link. Check your inbox!"}
        </p>
        {rateLimitSecs > 0 && (
          <div className="la-countdown">
            <div className="lab-label">Wait {rateLimitSecs}s before resending</div>
            <div className="la-countdown-track"><i style={{ width: `${Math.round((rateLimitSecs / 60) * 100)}%` }} /></div>
          </div>
        )}
        <div className="la-btn-col">
          {rateLimitSecs <= 0 ? (
            <Link href="/register" className="lab-btn lab-btn--solid lab-btn--lg lab-btn--block">Back to register</Link>
          ) : (
            <button disabled className="lab-btn lab-btn--ghost lab-btn--lg lab-btn--block">Resend in {rateLimitSecs}s</button>
          )}
          <Link href="/login" className="lab-btn lab-btn--ghost lab-btn--lg lab-btn--block">Sign in instead</Link>
        </div>
      </LabAuth>
    );
  }

  const strength = password ? STRENGTH_LEVELS[Math.min(getStrength(password), STRENGTH_LEVELS.length - 1)] : null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer strategy="afterInteractive" />
      <LabAuth
        wide
        kicker="New host"
        title={<>Claim your <span className="is-accent">name.</span></>}
        description="Reserve your infected.wtf link before someone else does — it's free, forever."
        sideTitle={<>Get<br /><span className="is-accent">infected.</span></>}
        alt={{ text: "Already a host?", label: "Log in", href: "/login" }}
      >
        {error && <div className="alert alert-error">⚠ {error}</div>}

        <form onSubmit={handleSubmit} className="auth-fields">
          <div className="auth-field">
            <label htmlFor="reg-username">Your link</label>
            <div className="reg-claim-field">
              <span className="reg-claim-prefix">infected.wtf/</span>
              <input
                id="reg-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={30}
                placeholder="yourname"
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="reg-email">Email</label>
            <input id="reg-email" type="email" className="form-control" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="auth-field">
            <label htmlFor="reg-pass">Password</label>
            <input
              id="reg-pass"
              type="password"
              className="form-control"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            {strength && (
              <div className="reg-strength">
                <div className="reg-strength-bar"><span style={{ width: `${strength.width}%`, background: strength.color }} /></div>
                <span style={{ color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>
          <div className="auth-field">
            <label htmlFor="reg-confirm">Confirm password</label>
            <input id="reg-confirm" type="password" className="form-control" placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="auth-field">
            <label htmlFor="reg-ref">Referral code <span className="reg-optional">optional</span></label>
            <input id="reg-ref" className="form-control" placeholder="Code or username" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} maxLength={20} />
          </div>

          <div className={`terms-wrap ${shake ? "shake" : ""}`} onClick={() => setTerms((t) => !t)}>
            <div className={`terms-box ${terms ? "checked" : ""}`}>
              {terms && (
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              )}
            </div>
            <div className="reg-terms-text">
              I agree to the <Link href="/terms" target="_blank" onClick={(e) => e.stopPropagation()}>Terms of Service</Link> and{" "}
              <Link href="/privacy" target="_blank" onClick={(e) => e.stopPropagation()}>Privacy Policy</Link>
            </div>
          </div>
          <div className="cf-turnstile auth-turnstile" data-sitekey="0x4AAAAAAFZb0eaZ25joGga3" data-callback="onTurnstileSuccess" data-expired-callback="onTurnstileExpired" data-theme="dark" />

          <button type="submit" disabled={loading || !terms} className="lab-btn lab-btn--solid lab-btn--lg lab-btn--block">
            {loading ? "Creating account…" : <>Create account <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" width="14" height="14"><path d="M5 12h14M13 6l6 6-6 6" /></svg></>}
          </button>
        </form>
      </LabAuth>
    </>
  );
}
