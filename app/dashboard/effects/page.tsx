"use client";

import { useEffect, useState } from "react";

type Item = { id: string; name: string; price: number; owned: boolean; type: string };

export default function EffectsPage() {
  const [effects, setEffects] = useState<Item[]>([]);
  const [active, setActive] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/shop");
    const data = await res.json();
    setEffects(data.effects.filter((e: Item) => e.owned));
    setActive(data.activeEffects || {});
  }

  useEffect(() => {
    load();
  }, []);

  async function equip(slot: string, id: string | null) {
    const res = await fetch("/api/shop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "equip_effect", effectId: id ?? "", slot }),
    });
    const data = await res.json();
    if (res.ok) setActive(data.activeEffects);
  }

  const grouped = {
    cursor: effects.filter((e) => e.type === "cursor"),
    avatar: effects.filter((e) => e.type === "avatar"),
    bg: effects.filter((e) => e.type === "bg"),
  };

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full">
      <h1 className="font-[var(--font-display)] text-2xl font-bold mb-2">Effects</h1>
      <p className="text-white/50 text-sm mb-6">
        Equip effects you&apos;ve purchased in the{" "}
        <a href="/dashboard/shop" className="text-[var(--accent)]">
          shop
        </a>
        .
      </p>

      {(["cursor", "avatar", "bg"] as const).map((slot) => (
        <div key={slot} className="gf-card p-4 mb-4">
          <h2 className="text-sm font-semibold text-white/60 mb-3 capitalize">{slot}</h2>
          {grouped[slot].length === 0 ? (
            <p className="text-white/30 text-xs">No {slot} effects owned yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => equip(slot, null)}
                className={`text-xs px-3 py-1.5 rounded-lg border ${!active[slot] ? "border-[var(--accent)] text-[var(--accent)]" : "border-white/10 text-white/60"}`}
              >
                None
              </button>
              {grouped[slot].map((e) => (
                <button
                  key={e.id}
                  onClick={() => equip(slot, e.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${active[slot] === e.id ? "border-[var(--accent)] text-[var(--accent)]" : "border-white/10 text-white/60"}`}
                >
                  {e.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
