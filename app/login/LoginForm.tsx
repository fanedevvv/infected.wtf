"use client";

import { useState } from "react";
import Link from "next/link";
import LabAuth from "@/components/lab/LabAuth";
import { useRouter } from "next/navigation";

export default function LoginForm({ verified }: { verified: boolean }) {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [banInfo, setBanInfo] = useState<{ permanent: boolean; daysLeft: number | null; until: string | null } | null>(null);
  const [reloginEmail, setReloginEmail] = useState<string | null>(null);
  const [need2fa, setNeed2fa] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resend, setResend] = useState<{ text: string; ok: boolean } | null>(null);
  const [resending, setResending] = useState(false);

  async function resendVerification() {
    setResending(true);
    setResend(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password, resendVerification: true }),
      });
      const data = await res.json();
      setResend(data.resent
        ? { text: "Verification email sent — check your inbox (and spam folder).", ok: true }
        : { text: data.error || "Something went wrong.", ok: false });
    } catch {
      setResend({ text: "Network error. Please try again.", ok: false });
    } finally {
      setResending(false);
    }
  }

  async function submit(e: React.FormEvent, code?: string) {
    e.preventDefault();
    setError("");
    setUnverified(false);
    setResend(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password, remember, twoFaCode: code ?? twoFaCode }),
      });
      const data = await res.json();
      if (data.relogin) {
        setReloginEmail(data.email);
        return;
      }
      if (!res.ok) {
        if (data.error === "banned") {
          const until = data.banUntil ? new Date(data.banUntil) : null;
          const permanent = !until;
          const daysLeft = until ? Math.max(0, Math.ceil((until.getTime() - Date.now()) / 86400000)) : null;
          setBanInfo({ permanent, daysLeft, until: data.banUntil });
          return;
        }
        setUnverified(!!data.unverified);
        setError(data.error || "Something went wrong.");
        return;
      }
      if (data.requiresTwoFa) {
        setNeed2fa(true);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (reloginEmail) {
    return (
      <LabAuth kicker="Security check" title={<>Check your <span className="is-accent">inbox.</span></>}>
        <p className="la-desc">
          You haven&apos;t logged in for over 30 days. We sent a verification link to{" "}
          <span className="la-hl">{reloginEmail}</span> — click it to access your account.
        </p>
      </LabAuth>
    );
  }

  return (
    <>
      <LabAuth
        kicker="Host access"
        title={<>Welcome <span className="is-accent">back.</span></>}
        description="Sign in to manage your infected.wtf page."
        sideTitle={<>Re-enter<br />the <span className="is-accent">lab.</span></>}
        alt={{ text: "No account?", label: "Get infected", href: "/register" }}
        footer={
          <>
            By signing in, you agree to our <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
          </>
        }
      >
        {verified && <div className="alert alert-success">Email verified — you can log in now.</div>}

        {banInfo ? (
          <div className="login-ban">
            <strong>Account suspended</strong>
            <span>
              {banInfo.permanent
                ? "This is a permanent ban. Contact an administrator to appeal."
                : banInfo.daysLeft !== null && banInfo.daysLeft <= 1
                  ? "Your ban expires today."
                  : `Your ban expires in ${banInfo.daysLeft} day(s).`}
            </span>
          </div>
        ) : error ? (
          <div className="alert alert-error">
            {error}
            {unverified && (
              <div className="login-resend">
                <button type="button" className="login-resend-btn" onClick={resendVerification} disabled={resending}>
                  {resending ? "Sending…" : "Resend verification email"}
                </button>
                {resend && <span className={resend.ok ? "login-resend-ok" : "login-resend-err"}>{resend.text}</span>}
              </div>
            )}
          </div>
        ) : null}

        <form onSubmit={submit} className="auth-fields">
          <div className="auth-field">
            <label htmlFor="login-id">Username or email</label>
            <input id="login-id" className="form-control" placeholder="yourname or you@example.com" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoFocus />
          </div>
          <div className="auth-field">
            <div className="login-label-row">
              <label htmlFor="login-pass">Password</label>
              <button type="button" className="login-forgot" onClick={() => setForgotOpen(true)}>Forgot password?</button>
            </div>
            <input id="login-pass" type="password" className="form-control" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>

          <div className="terms-wrap login-remember" onClick={() => setRemember((r) => !r)}>
            <div className={`terms-box ${remember ? "checked" : ""}`}>
              {remember && (
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              )}
            </div>
            <div className="reg-terms-text">Remember me for 30 days</div>
          </div>

          <button type="submit" disabled={loading} className="lab-btn lab-btn--solid lab-btn--lg lab-btn--block">
            {loading ? "Signing in…" : <>Sign in <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" width="14" height="14"><path d="M5 12h14M13 6l6 6-6 6" /></svg></>}
          </button>
        </form>
      </LabAuth>

      {forgotOpen && <ForgotPasswordModal onClose={() => setForgotOpen(false)} />}

      {need2fa && (
        <div className="lab-modal-overlay">
          <div className="lab-modal">
            <span className="lab-label"><span className="lab-dot" /> Two-factor auth</span>
            <h2 className="lab-modal-title">Enter your code</h2>
            <p className="lab-modal-sub">Open your authenticator app and enter the 6-digit code for infected.wtf.</p>
            <form onSubmit={(e) => submit(e, twoFaCode)}>
              <input
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="form-control lab-code-input"
                maxLength={6}
                inputMode="numeric"
                autoFocus
              />
              {error && <p className="lab-modal-err">{error}</p>}
              <button type="submit" className="lab-btn lab-btn--solid lab-btn--lg lab-btn--block">Verify code</button>
            </form>
            <button type="button" className="lab-modal-link" onClick={() => setNeed2fa(false)}>← Back to login</button>
          </div>
        </div>
      )}
    </>
  );
}

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setStatus({ text: res.ok ? data.message : data.error, ok: res.ok });
    } catch {
      setStatus({ text: "Network error.", ok: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lab-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lab-modal">
        <button className="lab-modal-close" onClick={onClose} aria-label="Close">✕</button>
        <span className="lab-label"><span className="lab-dot" /> Recovery</span>
        <h2 className="lab-modal-title">Reset password</h2>
        <p className="lab-modal-sub">Enter your email address and we&apos;ll send you a link to reset your password.</p>
        <input className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
        <button onClick={submit} disabled={loading} className="lab-btn lab-btn--solid lab-btn--lg lab-btn--block" style={{ marginTop: "1rem" }}>
          {loading ? "Sending…" : "Send reset link"}
        </button>
        {status && <div className={status.ok ? "lab-modal-ok" : "lab-modal-err"}>{status.text}</div>}
      </div>
    </div>
  );
}
