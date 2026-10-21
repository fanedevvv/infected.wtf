"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "@/lib/toast";
import { useT } from "@/lib/i18n/client";

type PrizeInfo = { label: string; color: string; type: string };

const TILE_WIDTH = 116;

// Summary of what the reel can land on (mirrors SPIN_PRIZES in lib/spin.ts).
const POSSIBLE_REWARDS = [
  { type: "tokens", title: "Tokens", sub: "10-100", color: "#9ca3af", highlight: false },
  { type: "tokens", title: "Tokens+", sub: "250", color: "#f97316", highlight: false },
  { type: "decoration", title: "Decoration", sub: "Random", color: "#c084fc", highlight: true },
  { type: "premium_days", title: "Infected Plus", sub: "1-3 days", color: "#fbbf24", highlight: true },
  { type: "badge", title: "Verified", sub: "Badge", color: "#34d399", highlight: true },
];
// The reel repeats the prize list; it always lands on the copy LAND_CYCLES lists in, so the tile under the
// pointer is prizes[index] whatever the number of prizes.
const LAND_CYCLES = 3;
const REEL_CYCLES = 5;

function PrizeIcon({ type }: { type: string }) {
  if (type === "premium_days") {
    return <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.6h7.6z" /></svg>;
  }
  if (type === "decoration") {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="26" height="26"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /></svg>;
  }
  if (type === "badge") {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="26" height="26"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" /></svg>;
}

function fmtCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function SpinClient({
  tokens,
  prizes,
  canSpin: initialCanSpin,
  nextAt: initialNextAt,
}: {
  tokens: number;
  prizes: PrizeInfo[];
  canSpin: boolean;
  nextAt: number | null;
}) {
  const t = useT();
  const [tokenBal, setTokenBal] = useState(tokens);
  const [canSpin, setCanSpin] = useState(initialCanSpin);
  const [nextAt, setNextAt] = useState<number | null>(initialNextAt);
  const [now, setNow] = useState(Date.now());
  const [spinning, setSpinning] = useState(false);
  const [offset, setOffset] = useState(0);
  const [transition, setTransition] = useState(false);
  const [result, setResult] = useState<{ label: string; type: string } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (nextAt && now >= nextAt) {
      setCanSpin(true);
      setNextAt(null);
    }
  }, [now, nextAt]);

  const sequence = Array.from({ length: prizes.length * REEL_CYCLES }, (_, i) => prizes[i % prizes.length]);

  async function spin() {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setResult(null);
    setTransition(false);
    setOffset(0);

    try {
      const res = await fetch("/api/daily-spin", { method: "POST" });
      const j = await res.json();
      if (!j.success) {
        showToast(j.error || "Could not spin", "error");
        setSpinning(false);
        if (j.nextAt) { setCanSpin(false); setNextAt(j.nextAt); }
        return;
      }

      const landingPos = prizes.length * LAND_CYCLES + j.index;
      const containerWidth = containerRef.current?.offsetWidth ?? 600;
      const target = landingPos * TILE_WIDTH + TILE_WIDTH / 2 - containerWidth / 2;

      requestAnimationFrame(() => {
        setTransition(true);
        setOffset(-target);
      });

      setTimeout(() => {
        setSpinning(false);
        setCanSpin(false);
        setNextAt(j.nextAt);
        setTokenBal(j.tokens);
        window.dispatchEvent(new Event("dash:refresh-me"));
        setResult({ label: j.prize.label, type: j.prize.type });
        showToast(`${t("You won")}: ${t(j.prize.label)}!`, "success");
      }, 3400);
    } catch {
      showToast(t("Network error"), "error");
      setSpinning(false);
    }
  }

  return (
    <>
      <div className="section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2>{t("Daily Spin")}</h2>
          <p>{t("Spin once every 24 hours for a chance at tokens, a decoration, Infected Plus days, or a badge")}</p>
        </div>
        <div className="shop-token-bal"><span>{tokenBal.toLocaleString()} tokens</span></div>
      </div>

      <div className="dash-card spin-card">
        <div className="spin-reel-wrap" ref={containerRef}>
          <div className="spin-pointer" />
          <div
            ref={trackRef}
            className="spin-track"
            style={{ transform: `translateX(${offset}px)`, transition: transition ? "transform 3.2s cubic-bezier(.12,.65,.1,1)" : "none" }}
          >
            {sequence.map((p, i) => (
              <div key={i} className="spin-tile" style={{ ["--sc" as string]: p.color }}>
                <PrizeIcon type={p.type} />
                <span>{t(p.label)}</span>
              </div>
            ))}
          </div>
        </div>

        {result && !spinning && (
          <div className="spin-result">{t("You won")}{" "}<strong style={{ color: "var(--accent)" }}>{t(result.label)}</strong>!</div>
        )}

        <button type="button" className="spin-btn" disabled={!canSpin || spinning} onClick={spin}>
          {spinning ? t("Spinning…") : canSpin ? t("Spin now") : t("Next spin in {time}", { time: nextAt ? fmtCountdown(nextAt - now) : "--:--:--" })}
        </button>
      </div>

      <div className="dash-card spin-rewards">
        <h3>{t("Possible rewards")}</h3>
        <div className="spin-rewards-list">
          {POSSIBLE_REWARDS.map((r) => (
            <div className="spin-reward" key={r.title}>
              <span className="spin-reward-icon" style={{ color: r.color, background: `color-mix(in srgb, ${r.color} 16%, transparent)` }}>
                <PrizeIcon type={r.type} />
              </span>
              <div>
                <b>{t(r.title)}</b>
                <span style={{ color: r.highlight ? r.color : undefined }}>{t(r.sub)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
