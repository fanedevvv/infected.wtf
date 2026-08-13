"use client";

import { useEffect, useMemo, useState } from "react";
import { showToast } from "@/lib/toast";
import { RARITY_COLOR } from "@/lib/decorations";
import type { DecorationRarity } from "@/lib/decorations";
import { DecorationFrame } from "@/components/DecorationSVGs";

type CatalogItem = { id: string; name: string; price: number; rarity: DecorationRarity; desc: string; owned: boolean };
const PAGE_SIZE = 48;
const RARITY_ORDER: Record<DecorationRarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

type SortMode = "rarity" | "price_asc" | "price_desc" | "alpha";

function normalizeDecorationId(id: string | null | undefined): string {
  if (!id) return "";
  return id.replace(/^(custom_\d+)\.(png|webp|jpe?g|gif)$/i, "$1");
}

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
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>("rarity");

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
  const activeNormalized = normalizeDecorationId(active);
  const visibleItems = useMemo(() => {
    const source = tab === "shop" ? items : inventoryItems;
    const query = search.trim().toLowerCase();
    const filtered = query ? source.filter((item) => item.name.toLowerCase().includes(query)) : source;

    return [...filtered].sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price || a.name.localeCompare(b.name);
      if (sortBy === "price_desc") return b.price - a.price || a.name.localeCompare(b.name);
      if (sortBy === "alpha") return a.name.localeCompare(b.name) || RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
      return RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || a.name.localeCompare(b.name);
    });
  }, [tab, items, inventoryItems, search, sortBy]);
  const totalPages = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [tab, search, sortBy]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return visibleItems.slice(start, start + PAGE_SIZE);
  }, [visibleItems, page]);

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
          <div style={{ fontWeight: 700, color: "#fff" }}>{active ? items.find((i) => normalizeDecorationId(i.id) === activeNormalized)?.name || "Active decoration" : "No decoration equipped"}</div>
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

      <div className="dash-card decorations-controls" style={{ marginBottom: "1.25rem" }}>
        <div className="decorations-search-wrap">
          <input
            className="form-control decorations-search-input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name"
            aria-label="Search decorations by name"
          />
          <select
            className="form-control decorations-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortMode)}
            aria-label="Sort decorations"
          >
            <option value="rarity">Sort by rarity</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="alpha">Alphabetical</option>
          </select>
        </div>
        <div className="decorations-controls-meta">
          <span>
            Showing {visibleItems.length.toLocaleString()} {visibleItems.length === 1 ? "decoration" : "decorations"}
          </span>
          {(search || sortBy !== "rarity") && (
            <button
              type="button"
              className="decorations-reset-btn"
              onClick={() => {
                setSearch("");
                setSortBy("rarity");
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <p style={{ color: "rgba(255,255,255,.4)", fontSize: ".9rem" }}>
          {search.trim()
            ? "No decorations match your search."
            : tab === "inventory"
              ? "You don&apos;t own any decorations yet — visit the Shop tab to buy some."
              : "No decorations available."}
        </p>
      ) : (
        <div className="shop-grid">
          {pageItems.map((it) => (
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
                  activeNormalized === normalizeDecorationId(it.id) ? (
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

      {visibleItems.length > PAGE_SIZE && (
        <div className="dash-card" style={{ marginTop: "1rem", padding: ".85rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".75rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: ".8rem", color: "rgba(255,255,255,.6)" }}>
            Page {page} / {totalPages} • {visibleItems.length.toLocaleString()} decorations
          </span>
          <div style={{ display: "flex", gap: ".5rem" }}>
            <button
              type="button"
              className="shop-buy-btn"
              style={{ width: "auto", padding: ".45rem .9rem" }}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="shop-buy-btn"
              style={{ width: "auto", padding: ".45rem .9rem" }}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
