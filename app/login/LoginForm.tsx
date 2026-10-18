"use client";

import { useState } from "react";
import Link from "next/link";
import BackHome from "@/components/BackHome";
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

  async function submit(e: React.FormEvent, code?: string) {
    e.preventDefault();
    setError("");
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
      <div className="reg-page">
        <div className="reg-glow" aria-hidden="true" />
        <BackHome />
        <header className="reg-head fade-in">
          <div className="reg-eyebrow">Security check</div>
          <h1>Check your <em>inbox</em>.</h1>
          <p>
            You haven&apos;t logged in for over 30 days. We sent a verification link to{" "}
            <span style={{ color: "#c4b5fd", fontWeight: 600 }}>{reloginEmail}</span> — click it to access your account.
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="reg-page">
      <div className="reg-glow" aria-hidden="true" />
      <BackHome />

      <header className="reg-head fade-in">
        <div className="reg-eyebrow">Welcome back</div>
        <h1>Sign in to your <em>page</em>.</h1>
        <p>Pick up right where you left off.</p>
      </header>

      <div className="reg-card reg-card--narrow fade-in-d1">
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
          <div className="alert alert-error">{error}</div>
        ) : null}

        <form onSubmit={submit} className="login-form">
          <div className="form-group">
            <label htmlFor="login-id">Username or email</label>
            <input id="login-id" className="form-control" placeholder="yourname or you@example.com" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoFocus />
          </div>
          <div className="form-group">
            <div className="login-label-row">
              <label htmlFor="login-pass">Password</label>
              <button type="button" className="login-forgot" onClick={() => setForgotOpen(true)}>Forgot password?</button>
            </div>
            <input id="login-pass" type="password" className="form-control" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>

          <div className="terms-wrap login-remember" onClick={() => setRemember((r) => !r)}>
            <div className={`terms-box ${remember ? "checked" : ""}`}>
              {remember && (
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              )}
            </div>
            <div className="reg-terms-text">Remember me for 30 days</div>
          </div>

          <button type="submit" disabled={loading} className="reg-submit">
            {loading ? "Signing in…" : <>Sign in <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></>}
          </button>
        </form>

        <div className="reg-signin">Don&apos;t have an account? <Link href="/register">Create one</Link></div>
      </div>

      {forgotOpen && <ForgotPasswordModal onClose={() => setForgotOpen(false)} />}

      {need2fa && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", background: "rgba(5,5,10,.92)", backdropFilter: "blur(10px)" }}>
          <div style={{ background: "rgba(10,10,22,.98)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, padding: "2.25rem 2rem", width: "100%", maxWidth: 380, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(251,191,36,.12)", border: "1.5px solid rgba(251,191,36,.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8" width="28" height="28"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <h2 style={{ fontWeight: 800, marginBottom: ".4rem", color: "#fbbf24" }}>Two-Factor Auth</h2>
            <p style={{ color: "var(--text-muted)", fontSize: ".82rem", marginBottom: "1.25rem" }}>
              Open your authenticator app and enter the 6-digit code for INFECTED.WTF.
            </p>
            <form onSubmit={(e) => submit(e, twoFaCode)}>
              <input
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                style={{ width: "100%", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 12, padding: ".85rem", color: "#fff", fontSize: "1.5rem", textAlign: "center", letterSpacing: ".35em", marginBottom: "1rem", boxSizing: "border-box" }}
                maxLength={6}
                inputMode="numeric"
                autoFocus
              />
              {error && <p style={{ color: "#ff8080", fontSize: ".78rem", marginBottom: ".85rem" }}>✗ {error}</p>}
              <button type="submit" style={{ width: "100%", background: "linear-gradient(135deg,rgba(251,191,36,.2),rgba(251,191,36,.1))", border: "1px solid rgba(251,191,36,.35)", color: "#fbbf24", fontWeight: 700, fontSize: ".85rem", padding: ".8rem", borderRadius: 10, cursor: "pointer" }}>
                Verify Code
              </button>
            </form>
            <p style={{ marginTop: "1rem", fontSize: ".72rem" }}>
              <a href="#" style={{ color: "var(--accent)" }} onClick={(e) => { e.preventDefault(); setNeed2fa(false); }}>← Back to login</a>
            </p>
          </div>
        </div>
      )}
    </div>
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
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", background: "rgba(5,5,10,.88)", backdropFilter: "blur(10px)" }}>
      <div style={{ background: "rgba(10,10,22,.98)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, padding: "2.25rem 2rem", width: "100%", maxWidth: 400, textAlign: "center", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: ".9rem", right: ".9rem", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, width: 30, height: 30, color: "rgba(255,255,255,.45)", cursor: "pointer" }}>✕</button>
        <div style={{ width: 54, height: 54, borderRadius: 16, background: "linear-gradient(135deg,rgba(30,64,175,.13),rgba(124,58,237,.13))", border: "1px solid rgba(124,58,237,.22)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.2rem" }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" width="26" height="26"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#7c3aed" /><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#7c3aed" /></svg>
        </div>
        <h2 style={{ fontWeight: 800, marginBottom: ".4rem" }}>Reset Password</h2>
        <p style={{ color: "rgba(255,255,255,.38)", fontSize: ".82rem", marginBottom: "1.4rem" }}>
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          style={{ width: "100%", background: "rgba(255,255,255,.06)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 12, padding: ".75rem 1rem", color: "#fff", fontSize: ".92rem", boxSizing: "border-box", marginBottom: "1rem" }}
        />
        <button
          onClick={submit}
          disabled={loading}
          style={{ width: "100%", padding: ".8rem", background: "linear-gradient(135deg,#1e40af,#7c3aed)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer" }}
        >
          {loading ? "Sending…" : "Send Reset Link"}
        </button>
        {status && <div style={{ marginTop: ".9rem", fontSize: ".82rem", color: status.ok ? "#5fefa5" : "#ff8080" }}>{status.text}</div>}
      </div>
    </div>
  );
}
