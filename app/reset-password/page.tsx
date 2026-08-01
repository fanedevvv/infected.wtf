"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
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
      setSuccess(true);
      setTimeout(() => router.push("/login"), 1500);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="gf-card w-full max-w-md p-8 text-center">
          <p className="text-white/60 text-sm">
            Missing reset token.{" "}
            <Link href="/forgot-password" className="text-[var(--accent)]">
              Request a new link
            </Link>
            .
          </p>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="gf-card w-full max-w-md p-8 text-center">
          <p className="text-emerald-300 text-sm">Password reset. Redirecting to login…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <form onSubmit={handleSubmit} className="gf-card w-full max-w-md p-8">
        <h1 className="font-[var(--font-display)] text-2xl font-bold mb-6">Set a new password</h1>
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <input
            type="password"
            className="gf-input"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <input
            type="password"
            className="gf-input"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading} className="gf-btn w-full mt-6">
          {loading ? "Saving…" : "Reset password"}
        </button>
      </form>
    </main>
  );
}
