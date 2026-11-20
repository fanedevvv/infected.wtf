"use client";

import { useEffect, useRef } from "react";
import { SCENES, type Scene } from "./profile-effects/scenes";

/**
 * Profile effects (collectibles), Discord-style: the animation is framed around the profile *card* — a big intro when
 * the profile opens, then a lighter loop. The canvas is one fixed full-viewport layer (so creatures can spill past the
 * card's edges); everything is drawn in card coordinates and follows the card as it scrolls/tilts. Fewer particles on
 * phones, paused while the tab is hidden, off for reduced motion.
 *
 * Custom effects uploaded by staff (animated WebP/GIF/APNG or WebM with transparency) are shown as a media overlay
 * stretched over the same card frame.
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
  snow: { shape: "flake", mode: "fall", colors: ["#ffffff", "#e6f4ff"], burst: 50, steady: 34, size: [1.2, 3.2], speed: [20, 50], wobble: 14 },
  petals: { shape: "petal", mode: "fall", colors: ["#ffb7cf", "#ff8fb4", "#ffd6e4"], burst: 60, steady: 18, size: [4, 8], speed: [30, 65], wobble: 30, spin: true },
  hearts: { shape: "heart", mode: "rise", colors: ["#ff4d8d", "#ff8fb4", "#ff2a55"], burst: 30, steady: 12, size: [7, 12], speed: [25, 60], wobble: 18, fade: true },
  confetti: { shape: "rect", mode: "blast", colors: ["#ff4fd8", "#ffd34f", "#4fffa8", "#4fd0ff", "#b14fff", "#ff5f5f"], burst: 110, steady: 8, size: [4, 8], speed: [300, 560], gravity: 460, spin: true },
  embers: { shape: "glow", mode: "rise", colors: ["#ffb347", "#ff7a18", "#ffd166"], burst: 45, steady: 26, size: [1.5, 3.5], speed: [35, 95], wobble: 22, fade: true },
  outbreak: { shape: "spore", mode: "burst", colors: ["#b6ff3b", "#7fd11b", "#d8ff8a"], burst: 80, steady: 22, size: [2, 5.5], speed: [120, 320], wobble: 10, fade: true, flash: "rgba(182,255,59,.22)" },
  shootingstars: { shape: "spark", mode: "streak", colors: ["#ffffff", "#cfe0ff", "#ffe9a8"], burst: 6, steady: 3, size: [1.5, 2.5], speed: [500, 800] },
  thunder: { shape: "dot", mode: "fall", colors: ["rgba(190,210,255,.55)"], burst: 0, steady: 30, size: [1, 1.5], speed: [500, 800], flash: "rgba(200,215,255,.35)", bolts: true },
  moneyrain: { shape: "coin", mode: "fall", colors: ["#ffd23f", "#f5b700", "#ffe58a"], burst: 50, steady: 18, size: [5, 9], speed: [80, 160], wobble: 8, spin: true },
  luckyspin: { shape: "spark", mode: "burst", colors: ["#ffd23f", "#fff2b0", "#ffb800"], burst: 70, steady: 16, size: [2, 4], speed: [100, 300], fade: true },
  completionist: { shape: "spark", mode: "burst", colors: ["#ff4fd8", "#ffd34f", "#4fffa8", "#4fd0ff", "#b14fff"], burst: 80, steady: 20, size: [2, 4.5], speed: [110, 320], fade: true },
  plusaura: { shape: "glow", mode: "rise", colors: ["#ffd700", "#fff1a8", "#ffb800"], burst: 40, steady: 24, size: [1.5, 3.5], speed: [25, 70], wobble: 24, fade: true },
  // scenes: the creature does the show; particles are just a light ambience inside the card
  jadedragon: { scene: "jadedragon", shape: "glow", mode: "rise", colors: ["#b6ff3b", "#39ff88", "#e6ffb0"], burst: 0, steady: 16, size: [1.2, 3], speed: [18, 45], wobble: 20, fade: true },
  infernodragon: { scene: "infernodragon", shape: "glow", mode: "rise", colors: ["#ffb347", "#ff7a18", "#ffd166"], burst: 0, steady: 20, size: [1.5, 3.2], speed: [35, 85], wobble: 22, fade: true },
  stormdragon: { scene: "stormdragon", shape: "dot", mode: "fall", colors: ["rgba(190,210,255,.45)"], burst: 0, steady: 26, size: [1, 1.5], speed: [500, 800] },
  phoenix: { scene: "phoenix", shape: "glow", mode: "rise", colors: ["#ffd166", "#ff7a18"], burst: 0, steady: 12, size: [1.2, 2.8], speed: [25, 60], wobble: 18, fade: true },
  koi: { scene: "koi", shape: "petal", mode: "fall", colors: ["#ffb7cf", "#ffd6e4"], burst: 0, steady: 6, size: [4, 7], speed: [16, 30], wobble: 24, spin: true },
  butterflies: { scene: "butterflies", shape: "glow", mode: "rise", colors: ["#ffffff"], burst: 0, steady: 0, size: [1, 2], speed: [10, 20] },
  aurora: { scene: "aurora", shape: "spark", mode: "streak", colors: ["#ffffff", "#cfe0ff"], burst: 0, steady: 2, size: [1.2, 2], speed: [450, 700] },
  jellyfish: { scene: "jellyfish", shape: "glow", mode: "rise", colors: ["#5ff3ff", "#a98bff", "#ffffff"], burst: 0, steady: 22, size: [0.8, 2], speed: [8, 24], wobble: 12, fade: true },
  patientzero: { shape: "spore", mode: "burst", colors: ["#b6ff3b", "#39ff14", "#e6ffb0"], burst: 110, steady: 26, size: [2, 6.5], speed: [160, 400], wobble: 12, fade: true, flash: "rgba(182,255,59,.3)", symbol: "☣" },
};

export type EffectMedia = { url: string; kind: "video" | "image" };
type P = { x: number; y: number; vx: number; vy: number; s: number; c: string; r: number; vr: number; life: number; max: number; ph: number };
type Frame = { x: number; y: number; w: number; h: number; r: number };

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** The profile "card" on each layout (first visible match wins); [data-fx-card] lets any page mark its own card. */
const CARD_SEL = [
  "[data-fx-card]", ".profile-card--classic", ".pl-inf-file", ".pl-holo-card", ".pl-split", ".pl-dock-card",
  ".pl-orbit-stage", ".pl-term-win", ".pl-scrap-top", ".pl-hex-hive", ".pl-vinyl", ".pl-const-sky",
].join(",");

function findCard(): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(CARD_SEL)) {
    const b = el.getBoundingClientRect();
    if (b.width > 80 && b.height > 80) return el;
  }
  return null;
}

/** Where the effect lives right now (viewport px). */
function measure(card: HTMLElement | null, radius: number): Frame {
  const vw = window.innerWidth, vh = window.innerHeight;
  let x = 0, y = 0, w = 0, h = 0, r = radius;
  if (card) {
    const b = card.getBoundingClientRect();
    x = b.left; y = b.top; w = b.width; h = b.height;
  }
  // full-bleed layouts (Modern, Deck…) have no single card: frame the whole screen, like a full Discord profile
  if (w < 80 || h < 80) { x = 10; y = 10; w = vw - 20; h = vh - 20; r = 24; }
  // only the part of a tall card that's on screen
  const top = Math.max(y, 0), bottom = Math.min(y + h, vh);
  if (bottom - top > 200) { y = top; h = bottom - top; }
  const left = Math.max(x, 0), right = Math.min(x + w, vw);
  if (right - left > 160) { x = left; w = right - left; }
  return { x, y, w, h, r };
}

export default function ProfileEffect({ effect, active, media }: { effect: string | null | undefined; active: boolean; media?: EffectMedia | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const preset = effect ? PRESETS[effect] : null;

  // uploaded effect: keep the media box glued to the card
  useEffect(() => {
    const box = mediaRef.current;
    if (!media || !box || !active) return;
    let card: HTMLElement | null = null, radius = 18, lastFind = 0, raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - lastFind > 1000) { card = findCard(); radius = card ? parseFloat(getComputedStyle(card).borderTopLeftRadius) || 16 : 22; lastFind = now; }
      const f = measure(card, radius);
      box.style.transform = `translate3d(${f.x}px,${f.y}px,0)`;
      box.style.width = `${f.w}px`; box.style.height = `${f.h}px`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [media, active]);

  useEffect(() => {
    const canvas = ref.current;
    if (!preset || !canvas || !active || media) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const small = window.matchMedia("(max-width: 760px), (hover: none)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let VW = 0, VH = 0;
    const resizeCanvas = () => {
      VW = window.innerWidth; VH = window.innerHeight;
      canvas.width = Math.round(VW * dpr); canvas.height = Math.round(VH * dpr);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let card = findCard();
    let radius = card ? parseFloat(getComputedStyle(card).borderTopLeftRadius) || 16 : 22;
    let lastFind = performance.now();
    let frame = measure(card, radius);
    let W = frame.w, H = frame.h;
    const scene: Scene | null = preset.scene && SCENES[preset.scene] ? SCENES[preset.scene](W, H, small) : null;

    const countScale = clamp(Math.sqrt((W * H) / (420 * 640)), 0.45, 1.4) * (small ? 0.75 : 1);
    const speedScale = clamp(Math.min(W, H) / 520, 0.55, 1.2);

    const parts: P[] = [];
    const spawn = (initial: boolean) => {
      const [smin, smax] = preset.size;
      const [vmin, vmax] = preset.speed;
      const p: P = { x: 0, y: 0, vx: 0, vy: 0, s: rnd(smin, smax), c: pick(preset.colors), r: rnd(0, Math.PI * 2), vr: preset.spin ? rnd(-3, 3) : 0, life: 0, max: rnd(6, 12), ph: rnd(0, 6.28) };
      const v = rnd(vmin, vmax);
      switch (preset.mode) {
        case "fall": p.x = rnd(0, W); p.y = initial ? rnd(-H, 0) : rnd(-30, -8); p.vy = v; p.vx = rnd(-12, 12); break;
        case "rise": p.x = rnd(0, W); p.y = initial ? rnd(H * 0.5, H + 30) : H + rnd(8, 30); p.vy = -v; p.vx = rnd(-8, 8); break;
        case "burst": {
          const a = rnd(0, Math.PI * 2), vv = v * speedScale;
          p.x = initial ? W / 2 + rnd(-20, 20) : rnd(0, W); p.y = initial ? H * 0.38 + rnd(-20, 20) : rnd(0, H);
          p.vx = Math.cos(a) * (initial ? vv : vv * 0.12); p.vy = Math.sin(a) * (initial ? vv : vv * 0.12); break;
        }
        case "blast": {
          const a = rnd(-Math.PI * 0.85, -Math.PI * 0.15), vv = v * speedScale;
          p.x = initial ? W / 2 + rnd(-40, 40) : rnd(0, W); p.y = initial ? H + 10 : rnd(-30, -10);
          p.vx = initial ? Math.cos(a) * vv : rnd(-20, 20); p.vy = initial ? Math.sin(a) * vv : rnd(50, 100); p.max = rnd(5, 9); break;
        }
        case "streak": {
          const vv = v * speedScale;
          p.x = rnd(W * 0.2, W * 1.1); p.y = rnd(-20, H * 0.45); const a = rnd(Math.PI * 0.72, Math.PI * 0.82);
          p.vx = Math.cos(a) * vv; p.vy = Math.sin(a) * vv; p.max = rnd(0.8, 1.4); break;
        }
      }
      parts.push(p);
    };

    for (let i = 0; i < Math.round(preset.burst * countScale); i++) spawn(true);
    const steady = preset.steady ? Math.max(2, Math.round(preset.steady * countScale)) : 0;
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
            const len = 70; const n = Math.hypot(p.vx, p.vy) || 1;
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
      while (y < H * rnd(0.45, 0.8)) { pts.push([x, y]); x += rnd(-30, 30); y += rnd(18, 45); }
      return { pts, t: 0 };
    };

    const clipPath = (pad: number) => {
      const x = frame.x - pad, y = frame.y - pad, w = frame.w + pad * 2, h = frame.h + pad * 2, r = Math.min(frame.r + pad, w / 2, h / 2);
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
      ctx.clip();
    };

    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (now - lastFind > 1000) {
        const c = findCard();
        if (c !== card) { card = c; radius = card ? parseFloat(getComputedStyle(card).borderTopLeftRadius) || 16 : 22; }
        lastFind = now;
      }
      const m = measure(card, radius);
      if (scene) {
        // keep creatures that coil outside the card on screen: pull the frame in when the card hugs the viewport edge
        const keep = Math.min(scene.pad() * 0.6, 40);
        const l = Math.max(m.x, keep), r = Math.min(m.x + m.w, VW - keep);
        if (r - l > 160) { m.x = l; m.w = r - l; }
        const t = Math.max(m.y, keep), b = Math.min(m.y + m.h, VH - keep);
        if (b - t > 200) { m.y = t; m.h = b - t; }
      }
      const jump = Math.abs(m.x - frame.x) + Math.abs(m.y - frame.y) > 300;
      const k = jump ? 1 : 0.35;
      frame = { x: frame.x + (m.x - frame.x) * k, y: frame.y + (m.y - frame.y) * k, w: frame.w + (m.w - frame.w) * k, h: frame.h + (m.h - frame.h) * k, r: m.r };
      if (Math.abs(frame.w - W) > 3 || Math.abs(frame.h - H) > 3) { W = frame.w; H = frame.h; scene?.resize(W, H); }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, VW, VH);
      ctx.save();
      clipPath(scene ? scene.pad() : 0);
      ctx.translate(frame.x, frame.y);

      if (flash > 0) { ctx.globalAlpha = flash; ctx.fillStyle = preset.flash!; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * 1.6); }
      if (symbol > 0) {
        ctx.globalAlpha = symbol * 0.55; ctx.fillStyle = preset.colors[0];
        ctx.font = `${Math.min(W, H) * 0.6}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(preset.symbol!, W / 2, H * 0.45); symbol = Math.max(0, symbol - dt * 0.7);
      }
      if (preset.bolts) {
        nextBolt -= dt;
        if (nextBolt <= 0) { bolt = makeBolt(); flash = 0.9; nextBolt = rnd(3.5, 7); }
        if (bolt) {
          bolt.t += dt;
          ctx.globalAlpha = Math.max(0, 1 - bolt.t * 4); ctx.strokeStyle = "#eef3ff"; ctx.lineWidth = 2.2;
          ctx.beginPath(); bolt.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
          if (bolt.t > 0.3) bolt = null;
        }
      }
      if (preset.mode === "streak") {
        streakTimer -= dt;
        if (streakTimer <= 0 && parts.length < steady) { spawn(false); streakTimer = rnd(0.8, 2.2); }
      } else if (parts.length < steady) {
        spawn(false);
      }

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (preset.gravity) p.vy += preset.gravity * speedScale * dt;
        if (preset.mode === "burst" || preset.mode === "blast") { p.vx *= 1 - dt * 1.6; if (preset.mode === "burst") p.vy *= 1 - dt * 1.6; }
        p.x += (p.vx + (preset.wobble ? Math.sin(p.ph + p.life * 2) * preset.wobble : 0)) * dt;
        p.y += p.vy * dt;
        p.r += p.vr * dt;
        const out = p.y > H + 50 || p.y < -60 || p.x < -90 || p.x > W + 90 || p.life > p.max;
        if (out) { parts.splice(i, 1); continue; }
        const a = preset.fade ? Math.max(0, Math.min(1, p.life * 3, (p.max - p.life) / 1.5)) : Math.min(1, p.life * 4);
        drawShape(p, a);
      }
      ctx.globalAlpha = 1;
      if (scene) { scene.update(dt); scene.draw(ctx); }
      ctx.restore();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resizeCanvas);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [preset, active, media]);

  if (media) {
    if (!active) return null;
    return (
      <div ref={mediaRef} className="profile-effect-media" aria-hidden="true">
        {media.kind === "video"
          ? <video src={media.url} autoPlay muted loop playsInline />
          // eslint-disable-next-line @next/next/no-img-element -- uploaded effect
          : <img src={media.url} alt="" />}
      </div>
    );
  }
  if (!preset) return null;
  return <canvas ref={ref} className="profile-effect-canvas" aria-hidden="true" />;
}

export const PROFILE_EFFECT_IDS = Object.keys(PRESETS);
