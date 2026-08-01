"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified") === "1";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "banned") {
          router.push(`/banned?until=${data.banUntil ?? "permanent"}`);
          return;
        }
        setError(data.error || "Something went wrong.");
        return;
      }
      if (data.requiresTwoFa) {
        router.push("/login/2fa");
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
      <form onSubmit={handleSubmit} className="gf-card w-full max-w-md p-8">
        <div className="text-xs font-extrabold tracking-widest text-[var(--accent)] uppercase mb-6">
          GETFAME.WTF
        </div>
        <h1 className="font-[var(--font-display)] text-2xl font-bold mb-1">Welcome back</h1>
        <p className="text-white/50 text-sm mb-6">Log in to manage your page.</p>

        {verified && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            Email verified — you can log in now.
          </div>
        )}
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
            <label className="block text-xs text-white/50 mb-1.5">Password</label>
            <input
              type="password"
              className="gf-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="gf-btn w-full mt-6">
          {loading ? "Logging in…" : "Log in"}
        </button>

        <p className="text-center text-white/40 text-xs mt-5">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[var(--accent)]">
            Register
          </Link>
        </p>
      </form>
    </main>
  );
}
