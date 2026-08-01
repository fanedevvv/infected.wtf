"use client";

import { useState } from "react";
import Link from "next/link";

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
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <form onSubmit={handleSubmit} className="gf-card w-full max-w-md p-8">
        <h1 className="font-[var(--font-display)] text-2xl font-bold mb-1">Forgot password</h1>
        <p className="text-white/50 text-sm mb-6">We&apos;ll send a reset link to your email.</p>

        {msg && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {msg}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <input
          type="email"
          className="gf-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={loading} className="gf-btn w-full mt-4">
          {loading ? "Sending…" : "Send reset link"}
        </button>
        <p className="text-center text-white/40 text-xs mt-5">
          <Link href="/login" className="text-[var(--accent)]">
            Back to login
          </Link>
        </p>
      </form>
    </main>
  );
}
