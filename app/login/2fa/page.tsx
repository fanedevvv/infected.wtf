"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TwoFaVerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
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

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <form onSubmit={handleSubmit} className="gf-card w-full max-w-sm p-8">
        <div className="text-xs font-extrabold tracking-widest text-[var(--accent)] uppercase mb-6">
          Two-factor authentication
        </div>
        <h1 className="font-[var(--font-display)] text-xl font-bold mb-1">Enter your code</h1>
        <p className="text-white/50 text-sm mb-6">Open your authenticator app and enter the 6-digit code.</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <input
          className="gf-input text-center text-2xl tracking-[0.4em]"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
          inputMode="numeric"
          autoFocus
        />

        <button type="submit" disabled={loading || code.length !== 6} className="gf-btn w-full mt-6">
          {loading ? "Verifying…" : "Verify"}
        </button>
      </form>
    </main>
  );
}
