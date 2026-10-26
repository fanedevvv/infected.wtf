"use client";

import { useState } from "react";
import LabAuth from "@/components/lab/LabAuth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setMsg(data.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LabAuth
      kicker="Recovery"
      title={<>Forgot <span className="is-accent">password?</span></>}
      description="We'll send a reset link to your email."
      alt={{ text: "Remembered it?", label: "Log in", href: "/login" }}
    >
      <form onSubmit={handleSubmit} className="auth-fields">
        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <div className="auth-field">
          <label htmlFor="fp-email">Email</label>
          <input id="fp-email" type="email" className="form-control" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button type="submit" disabled={loading} className="lab-btn lab-btn--solid lab-btn--lg lab-btn--block">
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </LabAuth>
  );
}
