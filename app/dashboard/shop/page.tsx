"use client";

import { useEffect, useState } from "react";

type Item = { id: string; name: string; price: number; owned: boolean; type?: string };

export default function ShopPage() {
  const [tokens, setTokens] = useState(0);
  const [badges, setBadges] = useState<Item[]>([]);
  const [effects, setEffects] = useState<Item[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const res = await fetch("/api/shop");
    const data = await res.json();
    setTokens(data.tokens);
    setBadges(data.badges);
    setEffects(data.effects);
  }

  useEffect(() => {
    load();
  }, []);

  async function buy(action: "buy_badge" | "buy_effect", id: string) {
    setMsg(null);
    const res = await fetch("/api/shop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "buy_badge" ? { action, badgeId: id } : { action, effectId: id }),
    });
    const data = await res.json();
    setMsg({ ok: res.ok, text: res.ok ? data.message : data.error });
    if (res.ok) load();
  }

  const grouped = {
    cursor: effects.filter((e) => e.type === "cursor"),
    avatar: effects.filter((e) => e.type === "avatar"),
    bg: effects.filter((e) => e.type === "bg"),
  };

  return (
    <main className="flex-1 px-4 py-10 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[var(--font-display)] text-2xl font-bold">Shop</h1>
        <div className="gf-card px-4 py-2 text-sm font-semibold">{tokens} tokens</div>
      </div>

      {msg && (
        <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${msg.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
          {msg.text}
        </div>
      )}

      <h2 className="text-sm font-semibold text-white/60 mb-3 mt-6">Badges</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {badges.map((b) => (
          <div key={b.id} className="gf-card p-4 text-center">
            <div className="text-sm font-medium mb-2">{b.name}</div>
            <div className="text-white/40 text-xs mb-3">{b.price} tokens</div>
            <button
              disabled={b.owned}
              onClick={() => buy("buy_badge", b.id)}
              className="gf-btn w-full text-xs py-1.5"
            >
              {b.owned ? "Owned" : "Buy"}
            </button>
          </div>
        ))}
      </div>

      {(["cursor", "avatar", "bg"] as const).map((slot) => (
        <div key={slot}>
          <h2 className="text-sm font-semibold text-white/60 mb-3 capitalize">{slot} effects</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {grouped[slot].map((e) => (
              <div key={e.id} className="gf-card p-4 text-center">
                <div className="text-sm font-medium mb-2">{e.name}</div>
                <div className="text-white/40 text-xs mb-3">{e.price} tokens</div>
                <button disabled={e.owned} onClick={() => buy("buy_effect", e.id)} className="gf-btn w-full text-xs py-1.5">
                  {e.owned ? "Owned" : "Buy"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
