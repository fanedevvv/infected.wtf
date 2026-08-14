"use client";

import { useRef, useState } from "react";
import { BADGE_SVG } from "@/lib/badge-defs";

type Card = {
  cardId: string;
  realId: string;
  name: string;
  desc: string;
  color: string;
  unlocked: boolean;
  hidden: boolean;
  elite: boolean;
};

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export default function BadgesGrid({ cards: initialCards, totalCount, earnedCount }: { cards: Card[]; totalCount: number; earnedCount: number }) {
  const [cards, setCards] = useState(initialCards);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set(initialCards.filter((c) => c.hidden).map((c) => c.cardId)));
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const orderTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function saveOrder(list: Card[]) {
    const order = list.filter((c) => c.unlocked).map((c) => c.cardId);
    fetch("/api/badge_settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_order", order }),
    });
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    setCards((prev) => {
      const list = [...prev];
      const fromIdx = list.findIndex((c) => c.cardId === dragId);
      const toIdx = list.findIndex((c) => c.cardId === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, moved);
      if (orderTimeout.current) clearTimeout(orderTimeout.current);
      orderTimeout.current = setTimeout(() => saveOrder(list), 0);
      return list;
    });
    setDragOverId(null);
  }

  async function toggleHidden(cardId: string) {
    const nowHidden = !hiddenIds.has(cardId);
    try {
      const res = await fetch("/api/badge_settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_hidden", badge_id: cardId, hidden: nowHidden }),
      });
      const j = await res.json();
      if (j.success) {
        setHiddenIds((prev) => {
          const next = new Set(prev);
          if (nowHidden) next.add(cardId);
          else next.delete(cardId);
          return next;
        });
      } else {
        alert(j.error || "Error updating badge visibility.");
      }
    } catch {
      alert("Network error.");
    }
  }

  return (
    <>
      <div className="section-header">
        <h2>Badges</h2>
        <p>Collect badges by being active on the platform.</p>
      </div>

      <div className="badges-meta">
        <span>{earnedCount} / {totalCount} unlocked</span>
      </div>

      <div className="badges-grid" id="badges-grid">
        {cards.map((c) => {
          const isHidden = c.unlocked && hiddenIds.has(c.cardId);
          const [r, g, b] = hexToRgb(c.color);
          const isHover = hoverId === c.cardId;
          const style: React.CSSProperties = c.unlocked
            ? {
                position: "relative",
                borderColor: isHover ? c.color : `rgba(${r},${g},${b},0.35)`,
                background: `rgba(${r},${g},${b},0.06)`,
                boxShadow: isHover ? `0 12px 30px rgba(${r},${g},${b},0.2)` : undefined,
              }
            : { position: "relative" };

          return (
            <div
              key={c.cardId}
              className={`badge-card ${c.unlocked ? "unlocked" : "locked"} ${isHidden ? "badge-hidden-card" : ""} ${c.elite ? "promoter-elite-card" : ""} ${dragOverId === c.cardId ? "drag-over" : ""} ${dragId === c.cardId ? "dragging" : ""}`}
              style={style}
              onMouseEnter={() => c.unlocked && setHoverId(c.cardId)}
              onMouseLeave={() => setHoverId(null)}
              onDragOver={(e) => {
                if (!c.unlocked || dragId === c.cardId) return;
                e.preventDefault();
                setDragOverId(c.cardId);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (c.unlocked) handleDrop(c.cardId);
              }}
            >
              {!c.unlocked && (
                <div className="badge-card-lock">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </div>
              )}

              {c.unlocked && (
                <div
                  className="badge-move-btn"
                  title="Drag to reorder"
                  draggable
                  onDragStart={() => setDragId(c.cardId)}
                  onDragEnd={() => {
                    setDragId(null);
                    setDragOverId(null);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M5 9l7-7 7 7M5 15l7 7 7-7" /></svg>
                </div>
              )}

              <div className="badge-card-icon" style={{ color: c.unlocked ? c.color : undefined }}>
                {BADGE_SVG[c.elite ? "promoter_elite" : c.realId] || (
                  <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8" /></svg>
                )}
              </div>

              <div className="badge-card-name" style={{ color: c.unlocked ? c.color : undefined }}>
                {c.name}
              </div>
              <div className="badge-card-desc">{c.desc}</div>

              <div
                className="badge-card-status"
                style={
                  c.unlocked
                    ? { background: `rgba(${r},${g},${b},0.15)`, color: c.color, borderColor: `rgba(${r},${g},${b},0.3)` }
                    : undefined
                }
              >
                {c.unlocked ? "OWNED" : "LOCKED"}
              </div>

              {c.unlocked && (
                <div className="badge-toggle-wrap" title={isHidden ? "Shown on profile: OFF" : "Shown on profile: ON"}>
                  <label className="badge-toggle-label">
                    <span className="badge-toggle-text">{isHidden ? "Hidden" : "Visible"}</span>
                    <div className={`badge-toggle-switch ${isHidden ? "" : "active"}`} onClick={() => toggleHidden(c.cardId)}>
                      <div className="badge-toggle-knob" />
                    </div>
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "1.2rem", padding: ".85rem 1.1rem", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, fontSize: ".78rem", color: "rgba(255,255,255,.45)", display: "flex", alignItems: "center", gap: ".5rem" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
        Click the arrows icon on an unlocked badge to drag and reorder how they appear on your profile.
      </div>
    </>
  );
}
