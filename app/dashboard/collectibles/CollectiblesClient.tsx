"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { showToast } from "@/lib/toast";
import NameTag from "@/components/NameTag";
import ProfileEffect from "@/components/ProfileEffect";
import { RARITY_COLOR, type CollectibleDef } from "@/lib/collectibles";

type Item = CollectibleDef & { owned: boolean; usable: boolean; minted?: number; open?: boolean; serial?: number };
type Tab = "nameplate" | "effect" | "limited";

const SOURCE_NOTE: Record<string, string> = { spin: "Daily Spin only", quest: "Quest reward", plus: "Free with Infected Plus" };

function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "ended";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}

export default function CollectiblesClient({ displayName }: { displayName: string }) {
  const [tab, setTab] = useState<Tab>("nameplate");
  const [items, setItems] = useState<Item[]>([]);
  const [tokens, setTokens] = useState(0);
  const [active, setActive] = useState<{ nameplate: string | null; effect: string | null }>({ nameplate: null, effect: null });
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    const j = await fetch("/api/collectibles").then((r) => r.json()).catch(() => null);
    if (j?.success) { setItems(j.items); setTokens(j.tokens); setActive(j.active); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Play an effect full-screen for a few seconds.
  useEffect(() => {
    if (!preview) return;
    const t = setTimeout(() => setPreview(null), 5000);
    return () => clearTimeout(t);
  }, [preview]);

  async function act(item: Item, action: "buy" | "equip" | "unequip") {
    setBusy(`${item.kind}:${item.id}`);
    try {
      const res = await fetch("/api/collectibles", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action === "unequip" ? "equip" : action, kind: item.kind, id: action === "unequip" ? null : item.id }),
      });
      const j = await res.json();
      if (!j.success) { showToast(j.error || "Error", "error"); return; }
      if (j.message) showToast(j.message, "success");
      if (action === "buy") window.dispatchEvent(new Event("dash:refresh-me"));
      await load();
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusy(null);
    }
  }

  const shown = items.filter((i) => (tab === "limited" ? !!i.limited : i.kind === tab && !i.limited));

  return (
    <div className="coll-page">
      <div className="dash-card coll-head">
        <div>
          <h2>Collectibles</h2>
          <p>Nameplates show behind your name everywhere — your page, comments, the leaderboard, crews. Profile effects play over your page when someone opens it.</p>
        </div>
        <div className="coll-balance"><span>Balance</span><b>{tokens.toLocaleString()}</b><small>tokens</small></div>
      </div>

      <div className="coll-tabs" role="tablist">
        {(["nameplate", "effect", "limited"] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t === "nameplate" ? "Nameplates" : t === "effect" ? "Profile effects" : "Limited drops"}
          </button>
        ))}
      </div>

      <div className="coll-grid">
        {shown.map((item) => {
          const key = `${item.kind}:${item.id}`;
          const equipped = active[item.kind] === item.id;
          const soldOut = item.limited && (item.minted ?? 0) >= item.limited.supply;
          return (
            <div key={key} className={`coll-card${equipped ? " is-equipped" : ""}`} style={{ ["--rar" as string]: RARITY_COLOR[item.rarity] }}>
              <div className="coll-preview">
                {item.kind === "nameplate" ? (
                  <NameTag name={displayName} nameplate={item.id} className="coll-preview-name" />
                ) : (
                  <button type="button" className="coll-play" onClick={() => setPreview(item.id)} aria-label={`Preview ${item.name}`}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z" /></svg> Preview
                  </button>
                )}
              </div>
              <div className="coll-info">
                <div className="coll-title"><b>{item.name}</b><span className="rar">{item.rarity}</span></div>
                <p>{item.desc}</p>
                {item.limited && (
                  <div className="coll-limited">
                    <div className="coll-supply"><i style={{ width: `${Math.min(100, ((item.minted ?? 0) / item.limited.supply) * 100)}%` }} /></div>
                    <small>{item.minted ?? 0}/{item.limited.supply} claimed · {timeLeft(item.limited.endsAt)}</small>
                    {item.serial && <small className="coll-serial">Your copy: #{item.serial}</small>}
                  </div>
                )}
              </div>
              <div className="coll-actions">
                {item.usable ? (
                  equipped ? (
                    <button type="button" className="btn btn-secondary btn-sm" disabled={busy === key} onClick={() => act(item, "unequip")}>Unequip</button>
                  ) : (
                    <button type="button" className="btn btn-primary btn-sm" disabled={busy === key} onClick={() => act(item, "equip")}>Equip</button>
                  )
                ) : item.source === "shop" || (item.source === "limited" && item.open && !soldOut) ? (
                  <button type="button" className="btn btn-primary btn-sm" disabled={busy === key || tokens < (item.price ?? 0)} onClick={() => act(item, "buy")}>
                    Buy · {item.price?.toLocaleString()} tokens
                  </button>
                ) : item.source === "limited" ? (
                  <span className="coll-note">{soldOut ? "Sold out" : "Drop ended"}</span>
                ) : item.source === "plus" ? (
                  <Link href="/dashboard?page=premium" className="coll-note coll-note--link">{SOURCE_NOTE.plus} →</Link>
                ) : item.source === "quest" ? (
                  <Link href="/dashboard?page=quests" className="coll-note coll-note--link">{SOURCE_NOTE.quest} →</Link>
                ) : (
                  <Link href="/dashboard?page=spin" className="coll-note coll-note--link">{SOURCE_NOTE[item.source]} →</Link>
                )}
                {equipped && <span className="coll-equipped">Equipped</span>}
              </div>
            </div>
          );
        })}
      </div>

      {preview && <ProfileEffect effect={preview} active />}
    </div>
  );
}
