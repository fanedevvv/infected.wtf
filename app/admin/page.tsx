"use client";

import { useEffect, useState } from "react";

type AdminUser = {
  id: number;
  username: string;
  isAdmin: boolean;
  isOwner: boolean;
  isMod: boolean;
  banned: boolean;
  banUntil: string | null;
  tokens: number;
  createdAt: string;
};

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [whitelist, setWhitelist] = useState<boolean | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
    if (res.status === 403) {
      setError("You don't have access to this page.");
      return;
    }
    const data = await res.json();
    setUsers(data.users || []);
  }

  async function loadSettings() {
    const res = await fetch("/api/admin/settings");
    if (res.ok) setWhitelist((await res.json()).whitelistEnabled);
  }

  useEffect(() => {
    load();
    loadSettings();
  }, []);

  async function act(targetId: number, action: string) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, action }),
    });
    if (res.ok) load();
    else setError((await res.json()).error);
  }

  async function toggleWhitelist() {
    const res = await fetch("/api/admin/settings", { method: "POST" });
    if (res.ok) setWhitelist((await res.json()).whitelistEnabled);
  }

  if (error) return <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full text-red-400">{error}</main>;

  return (
    <main className="flex-1 px-4 py-10 max-w-4xl mx-auto w-full">
      <h1 className="font-[var(--font-display)] text-2xl font-bold mb-6">Admin</h1>

      {whitelist !== null && (
        <div className="gf-card p-4 mb-6 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">Maintenance whitelist</div>
            <div className="text-white/40 text-xs">When enabled, only staff can access the site.</div>
          </div>
          <button onClick={toggleWhitelist} className={`gf-btn text-xs ${whitelist ? "" : "opacity-60"}`}>
            {whitelist ? "Enabled — disable" : "Disabled — enable"}
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <input
          className="gf-input"
          placeholder="Search username…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button onClick={load} className="gf-btn shrink-0">
          Search
        </button>
      </div>

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="gf-card p-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-sm font-medium">
                @{u.username} <span className="text-white/30 text-xs">#{u.id}</span>
                {u.isOwner && <span className="text-yellow-400 text-xs ml-2">owner</span>}
                {u.isAdmin && <span className="text-red-400 text-xs ml-2">admin</span>}
                {u.isMod && <span className="text-blue-400 text-xs ml-2">mod</span>}
                {u.banned && <span className="text-white/40 text-xs ml-2">banned</span>}
              </div>
              <div className="text-white/40 text-xs">{u.tokens} tokens</div>
            </div>
            <div className="flex gap-1.5 text-xs">
              <button onClick={() => act(u.id, u.banned ? "unban" : "ban")} className="px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5">
                {u.banned ? "Unban" : "Ban"}
              </button>
              <button onClick={() => act(u.id, u.isMod ? "revoke_mod" : "grant_mod")} className="px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5">
                {u.isMod ? "-Mod" : "+Mod"}
              </button>
              <button onClick={() => act(u.id, u.isAdmin ? "revoke_admin" : "grant_admin")} className="px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5">
                {u.isAdmin ? "-Admin" : "+Admin"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
