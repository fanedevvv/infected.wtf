"use client";

import { useEffect, useRef } from "react";
import { SCENES } from "./profile-effects/scenes";

/**
 * Profile effects (collectibles): an animation over the whole profile — a burst when the page is opened, then a
 * light steady drift. One canvas = one GPU layer; fewer particles on phones; paused while the tab is hidden; off for
 * reduced motion.
 */

type Shape = "dot" | "glow" | "petal" | "heart" | "rect" | "coin" | "spark" | "flake" | "spore";
type Mode = "fall" | "rise" | "burst" | "blast" | "streak";
type Preset = {
  shape: Shape; mode: Mode; colors: string[];
  burst: number; steady: number; size: [number, number]; speed: [number, number];
  gravity?: number; wobble?: number; spin?: boolean; fade?: boolean;
  flash?: string; bolts?: boolean; symbol?: string;
  /** a hand-drawn creature scene (dragons, phoenix…) drawn over the particles */
  scene?: string;
};

const PRESETS: Record<string, Preset> = {
  snow: { shape: "flake", mode: "fall", colors: ["#ffffff", "#e6f4ff"], burst: 70, steady: 45, size: [1.5, 4], speed: [25, 60], wobble: 18 },
  petals: { shape: "petal", mode: "fall", colors: ["#ffb7cf", "#ff8fb4", "#ffd6e4"], burst: 90, steady: 26, size: [5, 9], speed: [35, 80], wobble: 40, spin: true },
  hearts: { shape: "heart", mode: "rise", colors: ["#ff4d8d", "#ff8fb4", "#ff2a55"], burst: 40, steady: 16, size: [7, 13], speed: [30, 70], wobble: 22, fade: true },
  confetti: { shape: "rect", mode: "blast", colors: ["#ff4fd8", "#ffd34f", "#4fffa8", "#4fd0ff", "#b14fff", "#ff5f5f"], burst: 160, steady: 12, size: [5, 9], speed: [380, 720], gravity: 520, spin: true },
  embers: { shape: "glow", mode: "rise", colors: ["#ffb347", "#ff7a18", "#ffd166"], burst: 60, steady: 34, size: [1.5, 3.5], speed: [40, 110], wobble: 26, fade: true },
  outbreak: { shape: "spore", mode: "burst", colors: ["#b6ff3b", "#7fd11b", "#d8ff8a"], burst: 110, steady: 30, size: [2, 6], speed: [160, 420], wobble: 12, fade: true, flash: "rgba(182,255,59,.22)" },
  shootingstars: { shape: "spark", mode: "streak", colors: ["#ffffff", "#cfe0ff", "#ffe9a8"], burst: 10, steady: 4, size: [1.5, 2.5], speed: [700, 1100] },
  thunder: { shape: "dot", mode: "fall", colors: ["rgba(190,210,255,.55)"], burst: 0, steady: 40, size: [1, 1.5], speed: [600, 900], flash: "rgba(200,215,255,.35)", bolts: true },
  moneyrain: { shape: "coin", mode: "fall", colors: ["#ffd23f", "#f5b700", "#ffe58a"], burst: 70, steady: 24, size: [6, 10], speed: [90, 180], wobble: 10, spin: true },
  luckyspin: { shape: "spark", mode: "burst", colors: ["#ffd23f", "#fff2b0", "#ffb800"], burst: 90, steady: 22, size: [2, 4], speed: [120, 380], fade: true },
  completionist: { shape: "spark", mode: "burst", colors: ["#ff4fd8", "#ffd34f", "#4fffa8", "#4fd0ff", "#b14fff"], burst: 110, steady: 26, size: [2, 4.5], speed: [140, 420], fade: true },
  plusaura: { shape: "glow", mode: "rise", colors: ["#ffd700", "#fff1a8", "#ffb800"], burst: 50, steady: 30, size: [1.5, 3.5], speed: [30, 80], wobble: 30, fade: true },
  // scenes: the creature does the show; particles are just a light ambience
  jadedragon: { scene: "jadedragon", shape: "glow", mode: "rise", colors: ["#b6ff3b", "#39ff88", "#e6ffb0"], burst: 0, steady: 22, size: [1.2, 3], speed: [20, 55], wobble: 24, fade: true },
  infernodragon: { scene: "infernodragon", shape: "glow", mode: "rise", colors: ["#ffb347", "#ff7a18", "#ffd166"], burst: 0, steady: 26, size: [1.5, 3.5], speed: [40, 100], wobble: 26, fade: true },
  stormdragon: { scene: "stormdragon", shape: "dot", mode: "fall", colors: ["rgba(190,210,255,.45)"], burst: 0, steady: 34, size: [1, 1.5], speed: [600, 900] },
  phoenix: { scene: "phoenix", shape: "glow", mode: "rise", colors: ["#ffd166", "#ff7a18"], burst: 0, steady: 14, size: [1.2, 2.8], speed: [25, 60], wobble: 20, fade: true },
  koi: { scene: "koi", shape: "petal", mode: "fall", colors: ["#ffb7cf", "#ffd6e4"], burst: 0, steady: 7, size: [4, 7], speed: [18, 34], wobble: 30, spin: true },
  butterflies: { scene: "butterflies", shape: "glow", mode: "rise", colors: ["#ffffff"], burst: 0, steady: 0, size: [1, 2], speed: [10, 20] },
  aurora: { scene: "aurora", shape: "spark", mode: "streak", colors: ["#ffffff", "#cfe0ff"], burst: 0, steady: 2, size: [1.2, 2], speed: [700, 1000] },
  jellyfish: { scene: "jellyfish", shape: "glow", mode: "rise", colors: ["#5ff3ff", "#a98bff", "#ffffff"], burst: 0, steady: 30, size: [0.8, 2], speed: [8, 24], wobble: 14, fade: true },
  patientzero: { shape: "spore", mode: "burst", colors: ["#b6ff3b", "#39ff14", "#e6ffb0"], burst: 150, steady: 36, size: [2, 7], speed: [200, 520], wobble: 14, fade: true, flash: "rgba(182,255,59,.3)", symbol: "☣" },
};

type P = { x: number; y: number; vx: number; vy: number; s: number; c: string; r: number; vr: number; life: number; max: number; ph: number };

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export default function ProfileEffect({ effect, active }: { effect: string | null | undefined; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const preset = effect ? PRESETS[effect] : null;
    const canvas = ref.current;
    if (!preset || !canvas || !active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const small = window.matchMedia("(max-width: 760px), (hover: none)").matches;
    const scale = small ? 0.5 : 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let W = 0, H = 0;
    let sceneRef: { resize(w: number, h: number): void } | null = null;
    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      sceneRef?.resize(W, H);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const parts: P[] = [];
    const spawn = (initial: boolean) => {
      const [smin, smax] = preset.size;
      const [vmin, vmax] = preset.speed;
      const p: P = { x: 0, y: 0, vx: 0, vy: 0, s: rnd(smin, smax), c: pick(preset.colors), r: rnd(0, Math.PI * 2), vr: preset.spin ? rnd(-3, 3) : 0, life: 0, max: rnd(6, 12), ph: rnd(0, 6.28) };
      const v = rnd(vmin, vmax);
      switch (preset.mode) {
        case "fall": p.x = rnd(0, W); p.y = initial ? rnd(-H, 0) : rnd(-40, -10); p.vy = v; p.vx = rnd(-15, 15); break;
        case "rise": p.x = rnd(0, W); p.y = initial ? rnd(H * 0.5, H + 40) : H + rnd(10, 40); p.vy = -v; p.vx = rnd(-10, 10); break;
        case "burst": {
          const a = rnd(0, Math.PI * 2);
          const fromCenter = initial;
          p.x = fromCenter ? W / 2 + rnd(-30, 30) : rnd(0, W); p.y = fromCenter ? H * 0.42 + rnd(-30, 30) : rnd(0, H);
          p.vx = Math.cos(a) * (fromCenter ? v : v * 0.12); p.vy = Math.sin(a) * (fromCenter ? v : v * 0.12); break;
        }
        case "blast": {
          const a = rnd(-Math.PI * 0.85, -Math.PI * 0.15);
          p.x = initial ? W / 2 + rnd(-60, 60) : rnd(0, W); p.y = initial ? H + 10 : rnd(-30, -10);
          p.vx = initial ? Math.cos(a) * v : rnd(-20, 20); p.vy = initial ? Math.sin(a) * v : rnd(60, 120); p.max = rnd(5, 9); break;
        }
        case "streak": {
          p.x = rnd(W * 0.2, W * 1.1); p.y = rnd(-20, H * 0.45); const a = rnd(Math.PI * 0.72, Math.PI * 0.82);
          p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; p.max = rnd(0.8, 1.4); break;
        }
      }
      parts.push(p);
    };

    for (let i = 0; i < Math.round(preset.burst * scale); i++) spawn(true);
    const steady = preset.steady ? Math.max(2, Math.round(preset.steady * scale)) : 0;
    const scene = preset.scene && SCENES[preset.scene] ? SCENES[preset.scene](W, H, small) : null;
    sceneRef = scene;
    let flash = preset.flash ? 1 : 0;
    let symbol = preset.symbol ? 1 : 0;
    let nextBolt = 0.8;
    let bolt: { pts: [number, number][]; t: number } | null = null;
    let streakTimer = 0;

    const drawShape = (p: P, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.c;
      ctx.strokeStyle = p.c;
      const s = p.s;
      switch (preset.shape) {
        case "dot": ctx.fillRect(p.x, p.y, s * 0.6, s * 9); break;
        case "flake": case "spore":
          ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, 6.283); ctx.fill();
          if (preset.shape === "spore") { ctx.globalAlpha = alpha * 0.25; ctx.beginPath(); ctx.arc(p.x, p.y, s * 2.4, 0, 6.283); ctx.fill(); }
          break;
        case "glow": { ctx.globalAlpha = alpha * (0.6 + 0.4 * Math.sin(p.ph + p.life * 9)); ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, 6.283); ctx.fill(); ctx.globalAlpha *= 0.3; ctx.beginPath(); ctx.arc(p.x, p.y, s * 3, 0, 6.283); ctx.fill(); break; }
        case "petal": ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.55, 0, 0, 6.283); ctx.fill(); ctx.restore(); break;
        case "heart": ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s / 10, s / 10); ctx.beginPath(); ctx.moveTo(0, 3); ctx.bezierCurveTo(-10, -5, -4, -12, 0, -6); ctx.bezierCurveTo(4, -12, 10, -5, 0, 3); ctx.fill(); ctx.restore(); break;
        case "rect": ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillRect(-s / 2, -s / 4, s, s / 2); ctx.restore(); break;
        case "coin": { ctx.save(); ctx.translate(p.x, p.y); const w = Math.abs(Math.cos(p.r)) * s + 1; ctx.beginPath(); ctx.ellipse(0, 0, w, s, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = alpha * 0.5; ctx.strokeStyle = "#8a6200"; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); break; }
        case "spark": {
          if (preset.mode === "streak") {
            const len = 90; const n = Math.hypot(p.vx, p.vy) || 1;
            const g = ctx.createLinearGradient(p.x, p.y, p.x - (p.vx / n) * len, p.y - (p.vy / n) * len);
            g.addColorStop(0, p.c); g.addColorStop(1, "transparent");
            ctx.strokeStyle = g; ctx.lineWidth = s; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - (p.vx / n) * len, p.y - (p.vy / n) * len); ctx.stroke();
          } else {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); const t = s * (0.7 + 0.3 * Math.sin(p.ph + p.life * 8));
            ctx.beginPath(); ctx.moveTo(0, -t * 2.2); ctx.lineTo(t * 0.4, -t * 0.4); ctx.lineTo(t * 2.2, 0); ctx.lineTo(t * 0.4, t * 0.4); ctx.lineTo(0, t * 2.2); ctx.lineTo(-t * 0.4, t * 0.4); ctx.lineTo(-t * 2.2, 0); ctx.lineTo(-t * 0.4, -t * 0.4); ctx.closePath(); ctx.fill(); ctx.restore();
          }
          break;
        }
      }
    };

    const makeBolt = () => {
      const pts: [number, number][] = [];
      let x = rnd(W * 0.15, W * 0.85), y = 0;
      while (y < H * rnd(0.45, 0.8)) { pts.push([x, y]); x += rnd(-45, 45); y += rnd(25, 60); }
      return { pts, t: 0 };
    };

    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);

      if (flash > 0) { ctx.globalAlpha = flash; ctx.fillStyle = preset.flash!; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * 1.6); }
      if (symbol > 0) {
        ctx.globalAlpha = symbol * 0.55; ctx.fillStyle = preset.colors[0];
        ctx.font = `${Math.min(W, H) * 0.5}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(preset.symbol!, W / 2, H * 0.45); symbol = Math.max(0, symbol - dt * 0.7);
      }
      if (preset.bolts) {
        nextBolt -= dt;
        if (nextBolt <= 0) { bolt = makeBolt(); flash = 0.9; nextBolt = rnd(3.5, 7); }
        if (bolt) {
          bolt.t += dt;
          ctx.globalAlpha = Math.max(0, 1 - bolt.t * 4); ctx.strokeStyle = "#eef3ff"; ctx.lineWidth = 2.5; ctx.shadowColor = "#9fb4ff"; ctx.shadowBlur = 14;
          ctx.beginPath(); bolt.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.shadowBlur = 0;
          if (bolt.t > 0.3) bolt = null;
        }
      }
      if (preset.mode === "streak") {
        streakTimer -= dt;
        if (streakTimer <= 0 && parts.length < steady) { spawn(false); streakTimer = rnd(0.6, 1.8); }
      } else if (parts.length < steady) {
        spawn(false);
      }

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (preset.gravity) p.vy += preset.gravity * dt;
        if (preset.mode === "burst" || preset.mode === "blast") { p.vx *= 1 - dt * 1.6; if (preset.mode === "burst") p.vy *= 1 - dt * 1.6; }
        p.x += (p.vx + (preset.wobble ? Math.sin(p.ph + p.life * 2) * preset.wobble : 0)) * dt;
        p.y += p.vy * dt;
        p.r += p.vr * dt;
        const out = p.y > H + 60 || p.y < -80 || p.x < -120 || p.x > W + 120 || p.life > p.max;
        if (out) { parts.splice(i, 1); continue; }
        const a = preset.fade ? Math.max(0, Math.min(1, p.life * 3, (p.max - p.life) / 1.5)) : Math.min(1, p.life * 4);
        drawShape(p, a);
      }
      ctx.globalAlpha = 1;
      if (scene) { scene.update(dt); scene.draw(ctx); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      ctx.clearRect(0, 0, W, H);
    };
  }, [effect, active]);

  if (!effect || !PRESETS[effect]) return null;
  return <canvas ref={ref} className="profile-effect-canvas" aria-hidden="true" />;
}

export const PROFILE_EFFECT_IDS = Object.keys(PRESETS);
