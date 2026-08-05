"use client";

import { useState } from "react";
import { showToast } from "@/lib/toast";
import { RARITY_COLOR } from "@/lib/decorations";
import type { DecorationRarity } from "@/lib/decorations";
import { DecorationFrame } from "@/components/DecorationSVGs";

type CatalogItem = { id: string; name: string; price: number; rarity: DecorationRarity; desc: string; owned: boolean };

function TokenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
    </svg>
  );
}

export default function DecorationsClient({
  tokens,
  avatar,
  catalog,
  activeDecoration,
}: {
  tokens: number;
  avatar: string | null;
  catalog: CatalogItem[];
  activeDecoration: string | null;
}) {
  const [tab, setTab] = useState<"shop" | "inventory">("shop");
  const [tokenBal, setTokenBal] = useState(tokens);
  const [active, setActive] = useState(activeDecoration);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [items, setItems] = useState(catalog);

  async function buy(id: string, price: number) {
    if (tokenBal < price) { showToast("Not enough tokens.", "error"); return; }
    setBusyId(id);
    try {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "buy_decoration", decorationId: id }),
      });
      const j = await res.json();
      if (j.success) {
        setTokenBal(j.tokens);
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, owned: true } : it)));
        showToast("Decoration purchased!", "success");
      } else {
        showToast(j.error || "Purchase failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function equip(id: string | null) {
    setBusyId(id ?? "unequip");
    try {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "equip_decoration", decorationId: id ?? "" }),
      });
      const j = await res.json();
      if (j.success) {
        setActive(id);
        showToast(id ? "Decoration equipped!" : "Decoration removed", "success");
      } else {
        showToast(j.error || "Failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusyId(null);
    }
  }

  const inventoryItems = items.filter((it) => it.owned);
  const shown = tab === "shop" ? items : inventoryItems;

  return (
    <>
      <div className="section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2>Decorations</h2>
          <p>Equip a decorative frame around your avatar</p>
        </div>
        <div className="shop-token-bal"><TokenIcon /><span>{tokenBal.toLocaleString()} tokens</span></div>
      </div>

      <div className="dash-card" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
        <div className="decoration-preview-avatar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar ? `/${avatar}` : "/assets/img/default-avatar.png"} alt="" onError={(e) => { (e.target as HTMLImageElement).src = "/assets/img/default-avatar.png"; }} />
          <DecorationFrame id={active} />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: "#fff" }}>{active ? items.find((i) => i.id === active)?.name || "Active decoration" : "No decoration equipped"}</div>
          {active && (
            <button className="shop-buy-btn" style={{ marginTop: ".5rem", width: "auto", padding: ".5rem 1rem" }} disabled={busyId === "unequip"} onClick={() => equip(null)}>
              {busyId === "unequip" ? "Removing…" : "Remove decoration"}
            </button>
          )}
        </div>
      </div>

      <div className="appr-tabbar" style={{ marginBottom: "1.25rem" }}>
        <button type="button" className={`appr-tab ${tab === "shop" ? "active" : ""}`} style={{ border: "none", background: "none", cursor: "pointer" }} onClick={() => setTab("shop")}>Shop</button>
        <button type="button" className={`appr-tab ${tab === "inventory" ? "active" : ""}`} style={{ border: "none", background: "none", cursor: "pointer" }} onClick={() => setTab("inventory")}>My Inventory ({inventoryItems.length})</button>
      </div>

      {shown.length === 0 ? (
        <p style={{ color: "rgba(255,255,255,.4)", fontSize: ".9rem" }}>You don&apos;t own any decorations yet — visit the Shop tab to buy some.</p>
      ) : (
        <div className="shop-grid">
          {shown.map((it) => (
            <div key={it.id} className="shop-card" style={{ ["--sc" as string]: RARITY_COLOR[it.rarity] }}>
              <div className="shop-card-glow" />
              <div className="shop-card-top">
                <div className="decoration-card-avatar">
                  <div className="decoration-preview-avatar decoration-preview-avatar--sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatar ? `/${avatar}` : "/assets/img/default-avatar.png"} alt="" onError={(e) => { (e.target as HTMLImageElement).src = "/assets/img/default-avatar.png"; }} />
                    <DecorationFrame id={it.id} />
                  </div>
                </div>
                <div className="shop-card-info">
                  <div className="shop-card-title-row">
                    <span className="shop-card-name deco-name">{it.name}</span>
                    <span className="shop-card-price" style={{ color: RARITY_COLOR[it.rarity] }}>{it.rarity}</span>
                  </div>
                  <p className="shop-card-desc">{it.desc}</p>
                </div>
              </div>
              <div className="shop-card-actions" style={{ display: "flex", gap: ".5rem" }}>
                {it.owned ? (
                  active === it.id ? (
                    <div className="shop-card-owned-badge" style={{ flex: 1 }}>EQUIPPED</div>
                  ) : (
                    <button className="shop-buy-btn" disabled={busyId === it.id} onClick={() => equip(it.id)}>
                      {busyId === it.id ? "Equipping…" : "Equip"}
                    </button>
                  )
                ) : (
                  <button className="shop-buy-btn" disabled={busyId === it.id || tokenBal < it.price} onClick={() => buy(it.id, it.price)}>
                    {busyId === it.id ? "Buying…" : (<><TokenIcon /> {it.price.toLocaleString()}</>)}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
