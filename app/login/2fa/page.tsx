"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LabAuth from "@/components/lab/LabAuth";

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
    <LabAuth kicker="Two-factor authentication" title={<>Enter your <span className="is-accent">code.</span></>} description="Open your authenticator app and enter the 6-digit code.">
      <form onSubmit={handleSubmit} className="auth-fields">
        {error && <div className="alert alert-error">{error}</div>}
        <input
          className="form-control lab-code-input"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
          inputMode="numeric"
          placeholder="000000"
          autoFocus
        />
        <button type="submit" disabled={loading || code.length !== 6} className="lab-btn lab-btn--solid lab-btn--lg lab-btn--block">
          {loading ? "Verifying…" : "Verify"}
        </button>
      </form>
    </LabAuth>
  );
}
