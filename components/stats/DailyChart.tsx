"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { DayPoint } from "@/lib/site-stats";

const DEFAULT_W = 640;
const H = 200;
const PAD = { top: 12, right: 12, bottom: 26, left: 40 };

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => v <= s * 4) ?? pow * 10;
  return step * 4;
}

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });

/** Single-series daily area chart with a snapping crosshair tooltip. */
export default function DailyChart({ title, points, unit }: { title: string; points: DayPoint[]; unit: string }) {
  const gradId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  // Draw at the real pixel width so axis text stays readable on phones instead of being scaled down.
  const [W, setW] = useState(DEFAULT_W);
  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(260, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { max, xs, ys, line, area } = useMemo(() => {
    const max = niceMax(Math.max(...points.map((p) => p.value), 0));
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const xs = points.map((_, i) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW));
    const ys = points.map((p) => PAD.top + innerH - (p.value / max) * innerH);
    const line = xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join("");
    const area = `${line}L${xs[xs.length - 1].toFixed(1)},${PAD.top + innerH}L${xs[0].toFixed(1)},${PAD.top + innerH}Z`;
    return { max, xs, ys, line, area };
  }, [points, W]);

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    xs.forEach((px, i) => { if (Math.abs(px - x) < Math.abs(xs[best] - x)) best = i; });
    setHover(best);
  }

  const ticks = [0, max / 2, max];
  const labelIdx = [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const hp = hover !== null ? points[hover] : null;

  return (
    <figure className="st-chart">
      <figcaption className="st-chart-title">{title}</figcaption>
      <div className="st-chart-plot" ref={plotRef}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${title}, last ${points.length} days`}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover(points.length - 1)}
          onBlur={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? points.length) - 1));
            if (e.key === "ArrowRight") setHover((h) => Math.min(points.length - 1, (h ?? -1) + 1));
          }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--st-series)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--st-series)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => {
            const y = PAD.top + (H - PAD.top - PAD.bottom) * (1 - t / max);
            return (
              <g key={t}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} className="st-grid" />
                <text x={PAD.left - 8} y={y + 4} textAnchor="end" className="st-axis">{Math.round(t).toLocaleString()}</text>
              </g>
            );
          })}
          {labelIdx.map((i) => (
            <text key={i} x={xs[i]} y={H - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className="st-axis">{fmtDay(points[i].date)}</text>
          ))}
          <path d={area} fill={`url(#${gradId})`} />
          <path d={line} fill="none" stroke="var(--st-series)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && (
            <g>
              <line x1={xs[hover]} x2={xs[hover]} y1={PAD.top} y2={H - PAD.bottom} className="st-crosshair" />
              <circle cx={xs[hover]} cy={ys[hover]} r={5} fill="var(--st-series)" stroke="var(--st-surface)" strokeWidth={2} />
            </g>
          )}
        </svg>
        {hp && hover !== null && (
          <div className="st-tooltip" style={{ left: `${(xs[hover] / W) * 100}%` }} role="status">
            <strong>{hp.value.toLocaleString()}</strong>
            <span>{unit} · {fmtDay(hp.date)}</span>
          </div>
        )}
      </div>
      <details className="st-table">
        <summary>Show data</summary>
        <table>
          <thead><tr><th>Day</th><th>{unit}</th></tr></thead>
          <tbody>{points.map((p) => <tr key={p.date}><td>{fmtDay(p.date)}</td><td>{p.value.toLocaleString()}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}
