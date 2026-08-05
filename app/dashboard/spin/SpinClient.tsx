"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "@/lib/toast";

type PrizeInfo = { label: string; color: string; type: string };

const TILE_WIDTH = 116;
const REEL_LENGTH = 32;

function PrizeIcon({ type }: { type: string }) {
  if (type === "premium_days") {
    return <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.6h7.6z" /></svg>;
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

  const sequence = Array.from({ length: REEL_LENGTH }, (_, i) => prizes[i % prizes.length]);

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

      const landingPos = 24 + j.index;
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
        setResult({ label: j.prize.label, type: j.prize.type });
        showToast(`You won: ${j.prize.label}!`, "success");
      }, 3400);
    } catch {
      showToast("Network error", "error");
      setSpinning(false);
    }
  }

  return (
    <>
      <div className="section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2>Daily Spin</h2>
          <p>Spin once every 24 hours for a chance at tokens, premium days, or a badge</p>
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
                <span>{p.label}</span>
              </div>
            ))}
          </div>
        </div>

        {result && !spinning && (
          <div className="spin-result">You won <strong style={{ color: "var(--accent)" }}>{result.label}</strong>!</div>
        )}

        <button type="button" className="spin-btn" disabled={!canSpin || spinning} onClick={spin}>
          {spinning ? "Spinning…" : canSpin ? "Spin now" : `Next spin in ${nextAt ? fmtCountdown(nextAt - now) : "--:--:--"}`}
        </button>
      </div>
    </>
  );
}
