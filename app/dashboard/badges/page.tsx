"use client";

import { useEffect, useState } from "react";

type Badge = { id: string; label: string; hidden: boolean };

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/badges");
    const data = await res.json();
    setBadges(data.badges || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleHidden(id: string) {
    setBadges((b) => b.map((x) => (x.id === id ? { ...x, hidden: !x.hidden } : x)));
    await fetch("/api/badges", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggleHidden", badgeId: id }),
    });
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...badges];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBadges(next);
    await fetch("/api/badges", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", order: next.map((b) => b.id) }),
    });
  }

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full">
      <h1 className="font-[var(--font-display)] text-2xl font-bold mb-2">Badges</h1>
      <p className="text-white/50 text-sm mb-6">Reorder or hide badges shown on your public profile.</p>

      {loading ? (
        <p className="text-white/40 text-sm">Loading…</p>
      ) : badges.length === 0 ? (
        <p className="text-white/40 text-sm">You haven&apos;t earned any badges yet.</p>
      ) : (
        <div className="space-y-2">
          {badges.map((b, i) => (
            <div key={b.id} className="gf-card p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => move(i, -1)} className="text-white/30 hover:text-white/70 text-xs px-1">
                  ▲
                </button>
                <button onClick={() => move(i, 1)} className="text-white/30 hover:text-white/70 text-xs px-1">
                  ▼
                </button>
                <span className={`text-sm ${b.hidden ? "text-white/30 line-through" : ""}`}>{b.label}</span>
              </div>
              <button
                onClick={() => toggleHidden(b.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5"
              >
                {b.hidden ? "Show" : "Hide"}
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
