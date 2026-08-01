"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function SettingsPage() {
  const [me, setMe] = useState<{ username: string; twoFaEnabled: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setMe(d.user));
  }, []);

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full space-y-6">
      <h1 className="font-[var(--font-display)] text-2xl font-bold">Settings</h1>
      <UsernameSection current={me?.username} twoFaEnabled={!!me?.twoFaEnabled} />
      <PasswordSection twoFaEnabled={!!me?.twoFaEnabled} />
      <TwoFaSection enabled={!!me?.twoFaEnabled} onChange={(v) => setMe((m) => (m ? { ...m, twoFaEnabled: v } : m))} />
    </main>
  );
}

function UsernameSection({ current, twoFaEnabled }: { current?: string; twoFaEnabled: boolean }) {
  const [username, setUsername] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => setUsername(current || ""), [current]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/settings/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, twoFaCode }),
    });
    const data = await res.json();
    setMsg({ ok: res.ok, text: res.ok ? "Username updated." : data.error });
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="gf-card p-6 space-y-3">
      <h2 className="font-semibold">Username</h2>
      <input className="gf-input" value={username} onChange={(e) => setUsername(e.target.value)} />
      {twoFaEnabled && (
        <input
          className="gf-input"
          placeholder="2FA code"
          value={twoFaCode}
          onChange={(e) => setTwoFaCode(e.target.value)}
        />
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
      <button type="submit" disabled={loading} className="gf-btn">
        {loading ? "Saving…" : "Change username"}
      </button>
    </form>
  );
}

function PasswordSection({ twoFaEnabled }: { twoFaEnabled: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword, twoFaCode }),
    });
    const data = await res.json();
    setMsg({ ok: res.ok, text: res.ok ? "Password changed." : data.error });
    if (res.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTwoFaCode("");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="gf-card p-6 space-y-3">
      <h2 className="font-semibold">Password</h2>
      <input
        type="password"
        className="gf-input"
        placeholder="Current password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <input
        type="password"
        className="gf-input"
        placeholder="New password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <input
        type="password"
        className="gf-input"
        placeholder="Confirm new password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      {twoFaEnabled && (
        <input
          className="gf-input"
          placeholder="2FA code"
          value={twoFaCode}
          onChange={(e) => setTwoFaCode(e.target.value)}
        />
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
      <button type="submit" disabled={loading} className="gf-btn">
        {loading ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}

function TwoFaSection({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  const [step, setStep] = useState<"idle" | "setup">("idle");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function startSetup() {
    const res = await fetch("/api/settings/2fa");
    const data = await res.json();
    setSecret(data.secret);
    setQr(await QRCode.toDataURL(data.otpUri));
    setStep("setup");
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/settings/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, code }),
    });
    const data = await res.json();
    if (res.ok) {
      onChange(true);
      setStep("idle");
    } else {
      setMsg({ ok: false, text: data.error });
    }
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/settings/2fa", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: disableCode }),
    });
    const data = await res.json();
    if (res.ok) onChange(false);
    else setMsg({ ok: false, text: data.error });
  }

  return (
    <div className="gf-card p-6 space-y-3">
      <h2 className="font-semibold">Two-factor authentication</h2>
      {msg && <p className="text-sm text-red-400">{msg.text}</p>}

      {enabled ? (
        <form onSubmit={disable} className="space-y-3">
          <p className="text-white/50 text-sm">2FA is currently enabled.</p>
          <input
            className="gf-input"
            placeholder="6-digit code to disable"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
          />
          <button type="submit" className="gf-btn bg-red-500/80">
            Disable 2FA
          </button>
        </form>
      ) : step === "idle" ? (
        <button onClick={startSetup} className="gf-btn">
          Enable 2FA
        </button>
      ) : (
        <form onSubmit={confirmSetup} className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr && <img src={qr} alt="2FA QR code" className="rounded-lg" />}
          <p className="text-white/40 text-xs">Or enter manually: {secret}</p>
          <input
            className="gf-input"
            placeholder="6-digit code from your app"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit" className="gf-btn">
            Confirm & enable
          </button>
        </form>
      )}
    </div>
  );
}
