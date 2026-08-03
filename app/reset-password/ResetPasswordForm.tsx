"use client";

import { useState } from "react";
import RedirectCountdown from "@/components/RedirectCountdown";

function strengthWidthColor(pw: string): { width: string; color: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const colors = ["#ff4444", "#ff8c00", "#ffd700", "#34d399", "#39ff14"];
  const widths = ["20%", "40%", "60%", "80%", "100%"];
  const i = Math.min(score, 4);
  return pw.length ? { width: widths[i], color: colors[i] } : { width: "0%", color: "transparent" };
}

export default function ResetPasswordForm({
  token,
  initialStatus,
  username,
}: {
  token: string;
  initialStatus: "form" | "invalid" | "expired";
  username: string;
}) {
  const [status, setStatus] = useState<"form" | "invalid" | "expired" | "success">(initialStatus);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const bar = strengthWidthColor(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setStatus("success");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="confirm-wrap">
      <canvas id="particle-canvas" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />
      <div className="confirm-card">
        <a href="/" className="site-logo">INFECTED.WTF</a>

        {status === "invalid" && (
          <>
            <div className="ci warning">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffb400" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <h1 className="confirm-title">Invalid or Expired Link</h1>
            <p className="confirm-desc">This password reset link is <strong>invalid or has already been used</strong>. Please request a new one.</p>
            <div className="btn-row">
              <a href="/login" className="btn btn-primary btn-full">Request New Link</a>
              <a href="/" className="btn btn-secondary btn-full">Home</a>
            </div>
          </>
        )}

        {status === "expired" && (
          <>
            <div className="ci warning">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffb400" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <h1 className="confirm-title">Link Expired</h1>
            <p className="confirm-desc">This reset link has <strong>expired</strong> (valid for 1 hour). Please go back and request a new one.</p>
            <div className="btn-row">
              <a href="/login" className="btn btn-primary btn-full">Request New Link</a>
              <a href="/" className="btn btn-secondary btn-full">Home</a>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="ci success">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#39ff14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="7 12 10.5 15.5 17 9" /></svg>
            </div>
            <h1 className="confirm-title success-text">Password Reset!</h1>
            <p className="confirm-desc">Your password has been changed successfully. You can now sign in with your new password.</p>
            <div className="redirect-bar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              Redirecting to login in <RedirectCountdown seconds={3} to="/login" />s
            </div>
            <div className="btn-row">
              <a href="/login" className="btn btn-primary btn-full">Sign In →</a>
            </div>
          </>
        )}

        {status === "form" && (
          <>
            <div className="ci lock">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
                <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ff1a3c" /><stop offset="100%" stopColor="#39ff14" /></linearGradient></defs>
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="url(#lg)" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="url(#lg)" />
              </svg>
            </div>
            <h1 className="confirm-title">Set New Password</h1>
            <p className="confirm-desc">
              Setting a new password for <strong>{username}</strong>
            </p>

            {error && (
              <div className="rp-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="rp-field">
                <label className="rp-label">New Password</label>
                <input
                  className="rp-input"
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="pw-strength"><div className="pw-strength-bar" style={{ width: bar.width, background: bar.color }} /></div>
              </div>
              <div className="rp-field">
                <label className="rp-label">Confirm Password</label>
                <input
                  className="rp-input"
                  type="password"
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary btn-full" style={{ marginTop: ".25rem" }}>
                {loading ? "Saving…" : "Set New Password"}
              </button>
            </form>

            <div className="divider" />
            <p style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
              <a href="/login" style={{ color: "var(--accent)", textDecoration: "none" }}>← Back to Login</a>
            </p>
          </>
        )}

        {status !== "success" && (
          <>
            <div className="divider" />
            <p style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
              Need help? <a href="/support" style={{ color: "var(--accent)", textDecoration: "none" }}>Contact Support</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
