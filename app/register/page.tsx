"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, confirm, terms, referralCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
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
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="gf-card w-full max-w-md p-8 text-center">
          <h1 className="font-[var(--font-display)] text-2xl font-bold mb-3">Check your inbox</h1>
          <p className="text-white/60 text-sm leading-relaxed">
            We sent a verification link to <strong className="text-white">{pendingEmail}</strong>. Click it to
            activate your account, then{" "}
            <Link href="/login" className="text-[var(--accent)]">
              log in
            </Link>
            .
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <form onSubmit={handleSubmit} className="gf-card w-full max-w-md p-8">
        <div className="text-xs font-extrabold tracking-widest text-[var(--accent)] uppercase mb-6">
          GETFAME.WTF
        </div>
        <h1 className="font-[var(--font-display)] text-2xl font-bold mb-1">Create your account</h1>
        <p className="text-white/50 text-sm mb-6">Claim your link before someone else does.</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Username</label>
            <input className="gf-input" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Email</label>
            <input
              type="email"
              className="gf-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Password</label>
            <input
              type="password"
              className="gf-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Confirm password</label>
            <input
              type="password"
              className="gf-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Referral code (optional)</label>
            <input
              className="gf-input"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
            />
          </div>
          <label className="flex items-start gap-2 text-xs text-white/50">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5"
              required
            />
            I agree to the{" "}
            <Link href="/terms" className="text-[var(--accent)]">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-[var(--accent)]">
              Privacy Policy
            </Link>
            .
          </label>
        </div>

        <button type="submit" disabled={loading} className="gf-btn w-full mt-6">
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="text-center text-white/40 text-xs mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--accent)]">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
