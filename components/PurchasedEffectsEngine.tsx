"use client";

import { useEffect } from "react";

interface Props {
  purchasedEffects: string[];
  activeCursorEffect: string;
  activeBgEffect: string;
  cursorTrailEnabled: boolean;
  customCursorUrl: string | null;
}

type Renderer = (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => void;

// ── Background effects ──────────────────────────────────────────────────────
type Pt = { x: number; y: number };
type Spark = Pt & { vx: number; vy: number; life: number; trail: Pt[] };
type Burst = { particles: Spark[]; color: string; life: number; maxLife: number };
type Star = Pt & { r: number; tw: number };

function buildBgRenderers(): Record<string, Renderer> {
  let hellSeeds: { xBase: number; xWobble: number; speed: number; phase: number; sz0: number }[] | null = null;

  return {
    bg_fallingleaves: (() => {
      const LEAF_COUNT = 28;
      type Leaf = { xBase: number; phase: number; speed: number; swayAmp: number; swayFreq: number; rotSpeed: number; sz: number; colorIdx: number; swayOff: number };
      let seeds: Leaf[] | null = null;
      function initSeeds(): Leaf[] {
        return Array.from({ length: LEAF_COUNT }, (_, i) => ({
          xBase: Math.random(),
          phase: Math.random() * 100,
          speed: 0.18 + Math.random() * 0.32,
          swayAmp: 35 + Math.random() * 55,
          swayFreq: 0.018 + Math.random() * 0.022,
          rotSpeed: (Math.random() < 0.5 ? 1 : -1) * (0.02 + Math.random() * 0.04),
          sz: 5 + Math.random() * 5,
          colorIdx: i % 5,
          swayOff: Math.random() * Math.PI * 2,
        }));
      }
      function drawLeaf(ctx: CanvasRenderingContext2D, sz: number, color: string) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -sz);
        ctx.bezierCurveTo(sz * 0.9, -sz * 0.3, sz * 0.9, sz * 0.6, 0, sz);
        ctx.bezierCurveTo(-sz * 0.9, sz * 0.6, -sz * 0.9, -sz * 0.3, 0, -sz);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.18)";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, -sz * 0.85);
        ctx.lineTo(0, sz * 0.85);
        ctx.stroke();
      }
      function drawBranch(ctx: CanvasRenderingContext2D, W: number, H: number) {
        ctx.save();
        const bx = W * 0.98, by = 0;
        ctx.translate(bx, by);
        ctx.strokeStyle = "rgba(101,163,13,0.55)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-W * 0.08, H * 0.04, -W * 0.14, H * 0.09, -W * 0.22, H * 0.13);
        ctx.stroke();
        const subs = [
          { t: 0.25, angle: -0.6, len: W * 0.055, lw: 1.8 },
          { t: 0.5, angle: -0.9, len: W * 0.07, lw: 1.6 },
          { t: 0.7, angle: -0.4, len: W * 0.04, lw: 1.3 },
          { t: 0.85, angle: -1.1, len: W * 0.05, lw: 1.2 },
        ];
        function ptOnCurve(t: number) {
          const mt = 1 - t;
          return {
            x: mt * mt * mt * 0 + 3 * mt * mt * t * (-W * 0.08) + 3 * mt * t * t * (-W * 0.14) + t * t * t * (-W * 0.22),
            y: mt * mt * mt * 0 + 3 * mt * mt * t * (H * 0.04) + 3 * mt * t * t * (H * 0.09) + t * t * t * (H * 0.13),
          };
        }
        subs.forEach((s) => {
          const p = ptOnCurve(s.t);
          ctx.lineWidth = s.lw;
          ctx.strokeStyle = "rgba(101,163,13,0.45)";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + Math.cos(s.angle) * s.len, p.y + Math.sin(s.angle + 1.2) * s.len);
          ctx.stroke();
          const leafColors = ["#84cc16", "#65a30d", "#a3e635"];
          ctx.save();
          ctx.translate(p.x + Math.cos(s.angle) * s.len * 0.9, p.y + Math.sin(s.angle + 1.2) * s.len * 0.9);
          ctx.rotate(s.angle - Math.PI / 2);
          ctx.globalAlpha = 0.7;
          drawLeaf(ctx, s.lw * 2.5, leafColors[Math.floor(s.t * 3) % 3]);
          ctx.restore();
        });
        ctx.restore();
      }
      const colors = ["#84cc16", "#65a30d", "#a3e635", "#fbbf24", "#86efac"];
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        ctx.clearRect(0, 0, W, H);
        if (!seeds) seeds = initSeeds();
        drawBranch(ctx, W, H);
        for (let i = 0; i < seeds.length; i++) {
          const s = seeds[i];
          const prog = ((t * s.speed + s.phase) % 100) / 100;
          const y = prog * (H + 40) - 20;
          const x = (s.xBase * W + Math.sin(t * s.swayFreq + s.swayOff) * s.swayAmp + W) % W;
          const rot = t * s.rotSpeed + s.phase;
          const fadeIn = Math.min(1, prog * 12);
          const fadeOut = Math.min(1, (1 - prog) * 8);
          const alpha = 0.65 * fadeIn * fadeOut;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(x, y);
          ctx.rotate(rot);
          drawLeaf(ctx, s.sz, colors[s.colorIdx]);
          ctx.restore();
        }
      };
    })(),

    bg_underwater: (() => {
      const BCOUNT = 22;
      type Bubble = { x: number; wobbleOff: number; speed: number; r: number; phase: number; popAt: number; popping: boolean; popT: number; popX: number; popY: number };
      let bubbles: Bubble[] | null = null;
      function initBubbles(W: number): Bubble[] {
        return Array.from({ length: BCOUNT }, () => ({
          x: Math.random() * W, wobbleOff: Math.random() * Math.PI * 2,
          speed: 0.25 + Math.random() * 0.45, r: 2.5 + Math.random() * 5.5,
          phase: Math.random() * 100, popAt: 0.07 + Math.random() * 0.25,
          popping: false, popT: 0, popX: 0, popY: 0,
        }));
      }
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        ctx.clearRect(0, 0, W, H);
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "rgba(2,78,120,0.28)"); g.addColorStop(1, "rgba(0,30,60,0.15)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        for (let j = 0; j < 5; j++) {
          const rx = (W / 5) * j + W / 10 + Math.sin(t * 0.008 + j) * 30;
          ctx.save(); ctx.globalAlpha = 0.04 + Math.sin(t * 0.01 + j) * 0.02; ctx.fillStyle = "#bae6fd";
          ctx.beginPath(); ctx.moveTo(rx - 20, 0); ctx.lineTo(rx + 20, 0); ctx.lineTo(rx + 60, H); ctx.lineTo(rx - 60, H); ctx.closePath(); ctx.fill(); ctx.restore();
        }
        if (!bubbles) bubbles = initBubbles(W);
        for (let i = 0; i < bubbles.length; i++) {
          const b = bubbles[i];
          const prog = ((t * b.speed + b.phase) % 100) / 100;
          const riseY = H * (1 - prog);
          const bx = (b.x + Math.sin(prog * Math.PI * 3 + b.wobbleOff) * 22 + W) % W;
          if (!b.popping && prog >= (1 - b.popAt)) { b.popping = true; b.popT = 0; b.popX = bx; b.popY = riseY; }
          if (b.popping) {
            b.popT++; const pt = b.popT / 18;
            if (pt <= 1) {
              const pr = b.r * (1 + pt * 3);
              ctx.save(); ctx.globalAlpha = (1 - pt) * 0.55; ctx.strokeStyle = "#bae6fd"; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.arc(b.popX, b.popY, pr, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
              for (let d = 0; d < 4; d++) {
                const da = b.wobbleOff + d * Math.PI / 2;
                const dx = b.popX + Math.cos(da) * pr * 0.9;
                const dy = b.popY + Math.sin(da) * pr * 0.9;
                ctx.save(); ctx.globalAlpha = (1 - pt) * 0.5; ctx.fillStyle = "#7dd3fc";
                ctx.beginPath(); ctx.arc(dx, dy, Math.max(0.5, b.r * 0.22 * (1 - pt)), 0, Math.PI * 2); ctx.fill(); ctx.restore();
              }
            } else {
              b.x = Math.random() * W; b.wobbleOff = Math.random() * Math.PI * 2; b.speed = 0.25 + Math.random() * 0.45;
              b.r = 2.5 + Math.random() * 5.5; b.phase = Math.random() * 100; b.popAt = 0.07 + Math.random() * 0.25; b.popping = false; b.popT = 0;
            }
          } else {
            const alpha = prog < 0.08 ? prog / 0.08 : prog > 0.88 ? (1 - prog) / 0.12 : 1;
            ctx.save(); ctx.globalAlpha = alpha * 0.55; ctx.strokeStyle = "#7dd3fc"; ctx.lineWidth = 1.2; ctx.shadowColor = "#38bdf8"; ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(bx, riseY, b.r, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = alpha * 0.18; ctx.fillStyle = "#e0f2fe";
            ctx.beginPath(); ctx.arc(bx - b.r * 0.28, riseY - b.r * 0.28, b.r * 0.38, 0, Math.PI * 2); ctx.fill(); ctx.restore();
          }
        }
      };
    })(),

    bg_gas: (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
      ctx.clearRect(0, 0, W, H);
      const palettes = [["#6d28d9", "#7c3aed"], ["#4c1d95", "#5b21b6"], ["#1e1b4b", "#312e81"]];
      for (let i = 0; i < 8; i++) {
        const cx = W / 2 + Math.cos(t * 0.006 + i * 45 * Math.PI / 180) * W * 0.32;
        const cy = H / 2 + Math.sin(t * 0.008 + i * 45 * Math.PI / 180) * H * 0.32;
        const r = W * 0.15 + Math.sin(t * 0.012 + i) * W * 0.05;
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        const [c1] = palettes[i % palettes.length];
        grd.addColorStop(0, c1 + "44"); grd.addColorStop(1, "transparent");
        ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    },

    bg_fireworks: (() => {
      const bursts: Burst[] = [];
      const COLORS = ["#ffd700", "#f97316", "#ef4444", "#a78bfa", "#34d399", "#60a5fa", "#f472b6", "#facc15"];
      let lastBurst = 0;
      function spawnBurst(W: number, H: number) {
        const x = W * (0.15 + Math.random() * 0.7);
        const y = H * (0.1 + Math.random() * 0.6);
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const count = 28 + Math.floor(Math.random() * 16);
        const speed = 2.2 + Math.random() * 2.5;
        const particles: Spark[] = [];
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
          const s = speed * (0.5 + Math.random() * 0.8);
          particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.2, life: 1, trail: [] });
        }
        bursts.push({ particles, color, life: 1, maxLife: 70 + Math.floor(Math.random() * 30) });
      }
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        ctx.clearRect(0, 0, W, H);
        if (t - lastBurst > 88 + Math.floor(Math.random() * 30) || bursts.length === 0) {
          if (bursts.length < 5) { spawnBurst(W, H); lastBurst = t; }
        }
        if (bursts.length < 3 && t - lastBurst > 44) { spawnBurst(W, H); }
        for (let b = bursts.length - 1; b >= 0; b--) {
          const burst = bursts[b];
          burst.life -= 1 / burst.maxLife;
          if (burst.life <= 0) { bursts.splice(b, 1); continue; }
          for (const p of burst.particles) {
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 5) p.trail.shift();
            p.x += p.vx; p.y += p.vy;
            p.vx *= 0.97; p.vy = p.vy * 0.97 + 0.12;
            p.life = burst.life;
          }
          for (const p of burst.particles) {
            if (p.trail.length > 1) {
              ctx.save();
              ctx.strokeStyle = burst.color; ctx.lineWidth = 1.2; ctx.globalAlpha = p.life * 0.35;
              ctx.shadowColor = burst.color; ctx.shadowBlur = 4;
              ctx.beginPath(); ctx.moveTo(p.trail[0].x, p.trail[0].y);
              for (const pt of p.trail) ctx.lineTo(pt.x, pt.y);
              ctx.stroke(); ctx.restore();
            }
            const sz = Math.max(0.5, 3.5 * p.life);
            ctx.save();
            ctx.globalAlpha = p.life * 0.9; ctx.fillStyle = burst.color;
            ctx.shadowColor = burst.color; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
          }
        }
      };
    })(),

    bg_hell: (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, H, 0, 0);
      g.addColorStop(0, "rgba(239,68,68,0.3)"); g.addColorStop(0.4, "rgba(153,27,27,0.14)"); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const penta = (cx: number, cy: number, r: number, rot: number, alpha: number, clr: string) => {
        ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = clr; ctx.lineWidth = 1.2;
        ctx.shadowColor = clr; ctx.shadowBlur = 10; ctx.beginPath();
        for (let p = 0; p < 5; p++) {
          const a = rot + p * 4 * Math.PI / 5 - Math.PI / 2;
          const x = cx + r * Math.cos(a); const y = cy + r * Math.sin(a);
          if (p === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke(); ctx.restore();
      };
      const soul = (cx: number, cy: number, sz: number, alpha: number, clr: string) => {
        ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = clr; ctx.shadowColor = clr; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(cx, cy, sz, Math.PI, 0, false);
        ctx.lineTo(cx + sz, cy + sz * 1.8);
        ctx.quadraticCurveTo(cx + sz * 0.5, cy + sz * 1.35, cx, cy + sz * 1.6);
        ctx.quadraticCurveTo(cx - sz * 0.5, cy + sz * 1.35, cx - sz, cy + sz * 1.8);
        ctx.lineTo(cx - sz, cy); ctx.closePath(); ctx.fill(); ctx.restore();
      };
      for (let i = 0; i < 8; i++) {
        const sd = i * 137.508; const px = (Math.sin(sd) * 0.44 + 0.5) * W; const py = (Math.cos(sd * 0.7) * 0.28 + 0.3) * H * 0.65;
        const pr = 7 + Math.sin(sd * 0.3) * 5; const rot = t * 0.003 * (i % 2 ? 1 : -1) + sd;
        const a = 0.28 + Math.sin(t * 0.005 + sd) * 0.13; penta(px, py, pr, rot, a, "#ef4444");
      }
      if (!hellSeeds) { hellSeeds = Array.from({ length: 12 }, () => ({ xBase: Math.random(), xWobble: Math.random() * Math.PI * 2, speed: 0.6 + Math.random() * 0.5, phase: Math.random() * 100, sz0: 4 + Math.random() * 3 })); }
      for (let i = 0; i < 12; i++) {
        const s = hellSeeds[i]; const prog = ((t * s.speed + s.phase) % 100) / 100;
        const x = (s.xBase * W * 0.9 + W * 0.05 + Math.sin(prog * Math.PI * 4 + s.xWobble) * 28) % W;
        const y = H * (1 - prog * 0.93) + 10; const sz = s.sz0 + prog * 6;
        const a = prog < 0.1 ? prog * 10 : prog > 0.8 ? (1 - prog) / 0.2 : 0.75;
        const clr = prog > 0.55 ? "rgba(255,190,190,0.9)" : "rgba(255,110,110,0.88)";
        soul(x, y, sz, a, clr);
      }
    },

    bg_shadowworld: (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < 12; i++) {
        const x = W * 0.04 + i * (W * 0.09) + Math.sin(t * 0.005 + i * 0.7) * W * 0.11;
        const y = H * 0.08 + ((t * 0.18 + i * 9) % 100) / 100 * H * 0.88;
        const r = 22 + Math.sin(t * 0.012 + i) * 14;
        const g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
        g2.addColorStop(0, "rgba(109,40,217,0.30)"); g2.addColorStop(0.5, "rgba(76,29,149,0.18)"); g2.addColorStop(1, "transparent");
        ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      for (let i = 0; i < 8; i++) {
        const x = W * 0.07 + i * (W * 0.13) + Math.cos(t * 0.007 + i * 1.1) * W * 0.07;
        const y = H * 0.15 + ((t * 0.12 + i * 13) % 100) / 100 * H * 0.72;
        const r = 8 + Math.sin(t * 0.02 + i * 2) * 5;
        const g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
        g2.addColorStop(0, "rgba(139,92,246,0.35)"); g2.addColorStop(1, "transparent");
        ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      function drawBgEye(ex: number, ey: number, ew: number, blinkT: number, hue: number) {
        const eh = ew * 0.38;
        const blink = Math.max(0, Math.sin(blinkT));
        const scaleY = blink;
        if (scaleY < 0.02) return;
        ctx.save();
        ctx.translate(ex, ey);
        ctx.scale(1, scaleY);
        const grd = ctx.createRadialGradient(0, 0, ew * 0.1, 0, 0, ew * 1.4);
        grd.addColorStop(0, `hsla(${hue},80%,45%,0.18)`); grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd; ctx.beginPath(); ctx.ellipse(0, 0, ew * 1.4, eh * 1.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.shadowColor = `hsl(${hue},70%,40%)`; ctx.shadowBlur = 10;
        ctx.fillStyle = `hsl(${hue},60%,22%)`;
        ctx.beginPath();
        ctx.moveTo(-ew, 0);
        ctx.bezierCurveTo(-ew, -eh * 1.6, ew, -eh * 1.6, ew, 0);
        ctx.bezierCurveTo(ew, eh * 1.6, -ew, eh * 1.6, -ew, 0);
        ctx.fill(); ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.28; ctx.fillStyle = `hsl(${hue},70%,55%)`;
        ctx.beginPath();
        ctx.moveTo(-ew * 0.45, 0);
        ctx.bezierCurveTo(-ew * 0.45, -eh * 0.9, ew * 0.45, -eh * 0.9, ew * 0.45, 0);
        ctx.bezierCurveTo(ew * 0.45, eh * 0.9, -ew * 0.45, eh * 0.9, -ew * 0.45, 0);
        ctx.fill(); ctx.restore();
        ctx.save(); ctx.fillStyle = "#05000f";
        ctx.beginPath();
        ctx.moveTo(0, -eh * 0.88);
        ctx.bezierCurveTo(ew * 0.12, -eh * 0.35, ew * 0.12, eh * 0.35, 0, eh * 0.88);
        ctx.bezierCurveTo(-ew * 0.12, eh * 0.35, -ew * 0.12, -eh * 0.35, 0, -eh * 0.88);
        ctx.fill(); ctx.restore();
        ctx.save();
        ctx.strokeStyle = `hsla(${hue},70%,55%,0.65)`; ctx.lineWidth = 1;
        ctx.shadowColor = `hsl(${hue},70%,50%)`; ctx.shadowBlur = 7;
        ctx.beginPath();
        ctx.moveTo(-ew, 0);
        ctx.bezierCurveTo(-ew, -eh * 1.6, ew, -eh * 1.6, ew, 0);
        ctx.bezierCurveTo(ew, eh * 1.6, -ew, eh * 1.6, -ew, 0);
        ctx.stroke(); ctx.restore();
        ctx.restore();
      }
      const eyes = [
        { fx: 0.055, fy: 0.18, fs: 0.028, ph: 0, hue: 270 },
        { fx: 0.08, fy: 0.52, fs: 0.022, ph: 40, hue: 280 },
        { fx: 0.045, fy: 0.78, fs: 0.025, ph: 110, hue: 260 },
        { fx: 0.13, fy: 0.36, fs: 0.018, ph: 75, hue: 275 },
        { fx: 0.10, fy: 0.68, fs: 0.020, ph: 155, hue: 265 },
        { fx: 0.945, fy: 0.22, fs: 0.026, ph: 30, hue: 280 },
        { fx: 0.92, fy: 0.58, fs: 0.023, ph: 90, hue: 270 },
        { fx: 0.955, fy: 0.84, fs: 0.021, ph: 60, hue: 260 },
        { fx: 0.875, fy: 0.40, fs: 0.019, ph: 130, hue: 275 },
        { fx: 0.90, fy: 0.72, fs: 0.024, ph: 170, hue: 268 },
      ];
      eyes.forEach(({ fx, fy, fs, ph, hue }) => {
        const blinkT = Math.sin((t + ph) * 0.022) * Math.PI;
        ctx.save(); ctx.globalAlpha = 0.72 + Math.sin(t * 0.015 + ph) * 0.18;
        drawBgEye(fx * W, fy * H, fs * W, blinkT, hue);
        ctx.restore();
      });
      if (Math.sin(t * 0.04) > 0.75) {
        ctx.save(); ctx.globalAlpha = 0.07; ctx.strokeStyle = "#4c1d95"; ctx.lineWidth = 1;
        for (let y = 0; y < H; y += 6) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        ctx.restore();
      }
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, H * 0.9);
      vg.addColorStop(0, "transparent"); vg.addColorStop(1, "rgba(0,0,0,0.62)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    },


    bg_rain: (() => {
      let drops: { x: number; y: number; len: number; speed: number; drift: number }[] = [];
      let initedFor = 0;
      function init(W: number, H: number) {
        drops = Array.from({ length: 110 }, () => ({
          x: Math.random() * W,
          y: Math.random() * H,
          len: 14 + Math.random() * 18,
          speed: 7 + Math.random() * 6,
          drift: 1.2 + Math.random() * 0.8,
        }));
        initedFor = W * 10000 + H;
      }
      return (ctx: CanvasRenderingContext2D, W: number, H: number) => {
        if (initedFor !== W * 10000 + H) init(W, H);
        ctx.clearRect(0, 0, W, H);
        ctx.save();
        ctx.strokeStyle = "rgba(147,197,253,0.55)";
        ctx.lineWidth = 1.4;
        ctx.lineCap = "round";
        for (const d of drops) {
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - d.drift * 3, d.y + d.len);
          ctx.stroke();
          d.y += d.speed;
          d.x -= d.drift;
          if (d.y > H) { d.y = -d.len; d.x = Math.random() * W; }
          if (d.x < -20) d.x = W + 20;
        }
        ctx.restore();
      };
    })(),

    bg_sakura: (() => {
      let petals: { x: number; y: number; r: number; speed: number; sway: number; phase: number; rot: number }[] = [];
      let initedFor = 0;
      function init(W: number, H: number) {
        petals = Array.from({ length: 26 }, () => ({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 4 + Math.random() * 5,
          speed: 0.5 + Math.random() * 0.8,
          sway: 0.6 + Math.random() * 1.2,
          phase: Math.random() * Math.PI * 2,
          rot: Math.random() * Math.PI * 2,
        }));
        initedFor = W * 10000 + H;
      }
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        if (initedFor !== W * 10000 + H) init(W, H);
        ctx.clearRect(0, 0, W, H);
        for (const p of petals) {
          const x = p.x + Math.sin(t * 0.02 + p.phase) * p.sway * 12;
          ctx.save();
          ctx.translate(x, p.y);
          ctx.rotate(p.rot + t * 0.01);
          ctx.fillStyle = "rgba(249,168,212,0.75)";
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          p.y += p.speed;
          if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
        }
      };
    })(),

    bg_digitalgrid: (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
      ctx.clearRect(0, 0, W, H);
      const horizon = H * 0.55;
      const vg = ctx.createLinearGradient(0, 0, 0, horizon);
      vg.addColorStop(0, "rgba(0,212,255,0.04)"); vg.addColorStop(1, "rgba(0,212,255,0.12)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, horizon);
      ctx.save();
      ctx.strokeStyle = "rgba(0,212,255,0.35)";
      ctx.lineWidth = 1;
      ctx.shadowColor = "#00d4ff"; ctx.shadowBlur = 6;
      const vpX = W / 2;
      for (let i = -10; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(vpX + i * (W * 0.06), horizon);
        ctx.lineTo(vpX + i * (W * 0.6), H);
        ctx.stroke();
      }
      const rowCount = 14;
      for (let i = 0; i < rowCount; i++) {
        const prog = ((i / rowCount) + (t * 0.006) % 1) % 1;
        const y = horizon + prog * prog * (H - horizon);
        ctx.globalAlpha = 1 - prog;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.restore();
    },

    bg_aurora: (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
      ctx.clearRect(0, 0, W, H);
      const bands = [
        { color: "52,211,153", base: 0.18, amp: 0.12, speed: 0.006, off: 0 },
        { color: "56,189,248", base: 0.28, amp: 0.1, speed: 0.008, off: 2 },
        { color: "168,85,247", base: 0.12, amp: 0.14, speed: 0.005, off: 4 },
      ];
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const b of bands) {
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += W / 40) {
          const y = H * b.base + Math.sin(x * 0.006 + t * b.speed + b.off) * H * b.amp;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        const grd = ctx.createLinearGradient(0, 0, 0, H * 0.6);
        grd.addColorStop(0, `rgba(${b.color},0.35)`);
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.fill();
      }
      ctx.restore();
    },

    bg_tvglitch: (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(5,5,10,0.4)";
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = 0.85;
      for (let y = 0; y < H; y += 3) {
        ctx.fillStyle = (y / 3) % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)";
        ctx.fillRect(0, y, W, 1);
      }
      if (Math.random() < 0.18) {
        const bandY = Math.random() * H;
        const bandH = 6 + Math.random() * 26;
        const shift = (Math.random() - 0.5) * 40;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "rgba(255,26,60,0.4)";
        ctx.fillRect(shift, bandY, W, bandH);
        ctx.fillStyle = "rgba(57,255,20,0.3)";
        ctx.fillRect(-shift, bandY, W, bandH);
      }
      if (Math.random() < 0.05) {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);
      }
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 60; i++) {
        ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5);
      }
      ctx.restore();
      void t;
    },

    bg_matrix: (() => {
      let cols: { y: number; speed: number; len: number }[] = [];
      let initedFor = 0;
      const chars = "アイウエオカキクケコサシスセソ0123456789ABCDEFXYZ$#%&";
      const fontSize = 15;
      function init(W: number, H: number) {
        const count = Math.ceil(W / fontSize);
        cols = Array.from({ length: count }, () => ({
          y: Math.random() * -H,
          speed: 4 + Math.random() * 6,
          len: 8 + Math.floor(Math.random() * 14),
        }));
        initedFor = W * 10000 + H;
      }
      return (ctx: CanvasRenderingContext2D, W: number, H: number) => {
        if (initedFor !== W * 10000 + H) init(W, H);
        ctx.fillStyle = "rgba(3,6,3,0.18)";
        ctx.fillRect(0, 0, W, H);
        ctx.font = `${fontSize}px monospace`;
        ctx.textAlign = "center";
        cols.forEach((col, i) => {
          const x = i * fontSize + fontSize / 2;
          for (let j = 0; j < col.len; j++) {
            const y = col.y - j * fontSize;
            if (y < 0 || y > H) continue;
            const ch = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillStyle = j === 0 ? "rgba(200,255,200,0.9)" : `rgba(57,255,20,${Math.max(0, 0.7 - j * 0.05)})`;
            ctx.fillText(ch, x, y);
          }
          col.y += col.speed;
          if (col.y - col.len * fontSize > H) col.y = Math.random() * -200;
        });
      };
    })(),

    bg_lightning: (() => {
      let bolt: { x: number; y: number }[] | null = null;
      let boltLife = 0;
      let nextStrike = 40 + Math.random() * 80;
      function makeBolt(W: number, H: number) {
        const pts: { x: number; y: number }[] = [];
        let x = Math.random() * W * 0.6 + W * 0.2;
        let y = 0;
        pts.push({ x, y });
        while (y < H * 0.75) {
          x += (Math.random() - 0.5) * 60;
          y += 20 + Math.random() * 30;
          pts.push({ x, y });
        }
        return pts;
      }
      return (ctx: CanvasRenderingContext2D, W: number, H: number) => {
        ctx.clearRect(0, 0, W, H);
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "rgba(15,15,25,0.5)");
        sky.addColorStop(1, "rgba(5,5,10,0.2)");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);

        nextStrike--;
        if (nextStrike <= 0 && !bolt) {
          bolt = makeBolt(W, H);
          boltLife = 10;
          nextStrike = 60 + Math.random() * 140;
        }
        if (bolt) {
          ctx.save();
          if (boltLife > 6) {
            ctx.fillStyle = `rgba(255,255,255,${(boltLife - 6) * 0.05})`;
            ctx.fillRect(0, 0, W, H);
          }
          ctx.strokeStyle = "rgba(250,204,21,0.9)";
          ctx.shadowColor = "#facc15"; ctx.shadowBlur = 14;
          ctx.lineWidth = 2;
          ctx.globalAlpha = Math.min(1, boltLife / 6);
          ctx.beginPath();
          bolt.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
          ctx.stroke();
          ctx.restore();
          boltLife--;
          if (boltLife <= 0) bolt = null;
        }
      };
    })(),

    bg_galaxy: (() => {
      let stars: Star[] = [];
      let initedFor = 0;
      function init(W: number, H: number) {
        stars = Array.from({ length: 140 }, () => ({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.6 + 0.3,
          tw: Math.random() * Math.PI * 2,
        }));
        initedFor = W * 10000 + H;
      }
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        if (initedFor !== W * 10000 + H) init(W, H);
        ctx.clearRect(0, 0, W, H);
        ctx.save();
        const cx = W * 0.6, cy = H * 0.35;
        const neb = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.5);
        neb.addColorStop(0, "rgba(168,85,247,0.22)");
        neb.addColorStop(0.5, "rgba(99,102,241,0.12)");
        neb.addColorStop(1, "transparent");
        ctx.fillStyle = neb;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        for (const s of stars) {
          const alpha = 0.4 + Math.sin(t * 0.03 + s.tw) * 0.4;
          ctx.globalAlpha = Math.max(0, alpha);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };
    })(),

    bg_neoncity: (() => {
      let bld: { x: number; w: number; h: number; hue: number; flicker: number }[] = [];
      let initedFor = 0;
      function init(W: number, H: number) {
        const n = 16;
        bld = Array.from({ length: n }, (_, i) => {
          const w = W / n;
          return {
            x: i * w,
            w: w * (0.6 + Math.random() * 0.35),
            h: H * (0.18 + Math.random() * 0.55),
            hue: [300, 190, 320, 175][i % 4],
            flicker: Math.random() * Math.PI * 2,
          };
        });
        initedFor = W * 10000 + H;
      }
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        if (initedFor !== W * 10000 + H) init(W, H);
        ctx.clearRect(0, 0, W, H);
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "rgba(10,4,20,0.5)"); sky.addColorStop(1, "rgba(40,10,50,0.15)");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        for (const b of bld) {
          const y = H - b.h;
          ctx.save();
          ctx.fillStyle = "rgba(8,4,16,0.85)";
          ctx.fillRect(b.x, y, b.w, b.h);
          const glow = 0.5 + Math.sin(t * 0.04 + b.flicker) * 0.35;
          ctx.strokeStyle = `hsla(${b.hue},90%,60%,${glow})`;
          ctx.shadowColor = `hsl(${b.hue},90%,55%)`; ctx.shadowBlur = 8; ctx.lineWidth = 1.4;
          ctx.strokeRect(b.x + 1, y + 1, b.w - 2, b.h - 2);
          const rows = Math.floor(b.h / 14);
          ctx.fillStyle = `hsla(${b.hue},95%,65%,${glow * 0.8})`;
          for (let r = 0; r < rows; r++) {
            if ((r + Math.floor(t * 0.02)) % 3 === 0) continue;
            ctx.fillRect(b.x + b.w * 0.2, y + 8 + r * 14, b.w * 0.6, 2.2);
          }
          ctx.restore();
        }
      };
    })(),

    bg_bioluminescent: (() => {
      let dots: { x: number; y: number; sp: number; ph: number; r: number }[] = [];
      let initedFor = 0;
      function init(W: number, H: number) {
        dots = Array.from({ length: 34 }, () => ({
          x: Math.random(), y: 0.55 + Math.random() * 0.45,
          sp: 0.3 + Math.random() * 0.5, ph: Math.random() * 100,
          r: 1.2 + Math.random() * 2.2,
        }));
        initedFor = W * 10000 + H;
      }
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        if (initedFor !== W * 10000 + H) init(W, H);
        ctx.clearRect(0, 0, W, H);
        for (let layer = 0; layer < 3; layer++) {
          const baseY = H * (0.62 + layer * 0.13);
          const amp = 10 + layer * 6;
          const speed = 0.015 + layer * 0.006;
          ctx.save();
          ctx.globalAlpha = 0.22 - layer * 0.04;
          ctx.beginPath();
          ctx.moveTo(0, H);
          for (let x = 0; x <= W; x += W / 40) {
            const y = baseY + Math.sin(x * 0.02 + t * speed + layer) * amp;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(W, H); ctx.closePath();
          const g = ctx.createLinearGradient(0, baseY - amp, 0, H);
          g.addColorStop(0, "rgba(45,212,191,0.55)"); g.addColorStop(1, "rgba(8,145,178,0.05)");
          ctx.fillStyle = g; ctx.fill();
          ctx.restore();
        }
        for (const d of dots) {
          const prog = ((t * d.sp + d.ph) % 100) / 100;
          const x = d.x * W;
          const wave = Math.sin(x * 0.02 + t * 0.02) * 10;
          const y = H * d.y + wave;
          const tw = 0.4 + Math.sin(t * 0.06 + d.ph) * 0.4;
          ctx.save();
          ctx.globalAlpha = Math.max(0, tw) * (1 - prog * 0.3);
          ctx.fillStyle = "#5eead4"; ctx.shadowColor = "#2dd4bf"; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.arc(x, y, d.r, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      };
    })(),

    bg_meteors: (() => {
      let stars: Star[] = [];
      let meteors: (Pt & { vx: number; vy: number; life: number })[] = [];
      let lastSpawn = 0;
      let initedFor = 0;
      function init(W: number, H: number) {
        stars = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + 0.2, tw: Math.random() * Math.PI * 2 }));
        initedFor = W * 10000 + H;
      }
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        if (initedFor !== W * 10000 + H) { init(W, H); meteors = []; }
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        for (const s of stars) {
          ctx.globalAlpha = Math.max(0, 0.35 + Math.sin(t * 0.03 + s.tw) * 0.35);
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (t - lastSpawn > 45 && meteors.length < 3) {
          lastSpawn = t;
          meteors.push({ x: Math.random() * W * 0.6, y: -10, vx: 3.4 + Math.random() * 1.5, vy: 2.2 + Math.random(), life: 1 });
        }
        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i];
          m.x += m.vx; m.y += m.vy; m.life -= 0.012;
          if (m.life <= 0 || m.x > W + 20 || m.y > H + 20) { meteors.splice(i, 1); continue; }
          ctx.save();
          const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 9, m.y - m.vy * 9);
          grad.addColorStop(0, `rgba(147,197,253,${m.life})`); grad.addColorStop(1, "transparent");
          ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.lineCap = "round";
          ctx.shadowColor = "#93c5fd"; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * 9, m.y - m.vy * 9); ctx.stroke();
          ctx.fillStyle = `rgba(255,255,255,${m.life})`;
          ctx.beginPath(); ctx.arc(m.x, m.y, 1.6, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      };
    })(),
  };
}

function runBgEffect(BE: string): () => void {
  const bgCanvas = document.createElement("canvas");
  bgCanvas.id = "purchased-bg-canvas";
  bgCanvas.style.cssText = "position:fixed;top:0;left:0;pointer-events:none;z-index:1;opacity:.85;display:block;";
  const _profileBg = document.getElementById("profile-bg");
  if (_profileBg && _profileBg.parentNode) {
    _profileBg.parentNode.insertBefore(bgCanvas, _profileBg.nextSibling);
  } else {
    document.body.insertBefore(bgCanvas, document.body.firstChild);
  }
  const bgCtx = bgCanvas.getContext("2d")!;
  let W = 0, H = 0;
  function resizeBg() {
    W = bgCanvas.width = window.innerWidth;
    H = bgCanvas.height = window.innerHeight;
    bgCanvas.style.width = W + "px";
    bgCanvas.style.height = H + "px";
  }
  resizeBg();
  window.addEventListener("resize", resizeBg);

  const bgRenderers = buildBgRenderers();
  let bgFrame = 0;
  let raf = 0;
  let stopped = false;
  if (bgRenderers[BE]) {
    const loop = () => {
      if (stopped) return;
      bgRenderers[BE](bgCtx, W, H, bgFrame++);
      raf = requestAnimationFrame(loop);
    };
    loop();
  }

  return () => {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener("resize", resizeBg);
    bgCanvas.remove();
  };
}

// ── Cursor trail effects ────────────────────────────────────────────────────
function runCursorEffect(CE: string): (() => void) | null {
  const isShadow = CE === "cursor_shadow";
  type TrailParticle = Pt & {
    vx: number; vy: number; life: number; maxLife: number; sz: number; color: string;
    rot: number; rspd: number; swayPhase: number; char: string;
  };
  const particles: TrailParticle[] = [];
  let mx = 0, my = 0;
  const onMouseMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
  document.addEventListener("mousemove", onMouseMove);

  const pCanvas = document.createElement("canvas");
  pCanvas.style.cssText = "position:fixed;top:0;left:0;pointer-events:none;z-index:9998;display:block;";
  pCanvas.width = innerWidth; pCanvas.height = innerHeight;
  pCanvas.style.width = pCanvas.width + "px"; pCanvas.style.height = pCanvas.height + "px";
  document.body.appendChild(pCanvas);
  const pc = pCanvas.getContext("2d")!;
  const onResize = () => {
    pCanvas.width = innerWidth; pCanvas.height = innerHeight;
    pCanvas.style.width = pCanvas.width + "px"; pCanvas.style.height = pCanvas.height + "px";
  };
  window.addEventListener("resize", onResize);

  type TrailConfig = {
    count: number; life: number; spd: number; sz: () => number; color: () => string; grow: boolean;
    ring?: boolean; meteor?: boolean; leaf?: boolean; soul?: boolean; sparkle?: boolean; snow?: boolean;
    heart?: boolean; butterfly?: boolean; matrixchar?: boolean; glow?: boolean;
  };
  const configs: Record<string, TrailConfig> = {
    cursor_smoke: { count: 2, life: 60, spd: 1.2, sz: () => 4 + Math.random() * 6, color: () => `hsla(0,0%,${60 + Math.random() * 20}%,`, grow: true },
    cursor_fire: { count: 3, life: 40, spd: 1.8, sz: () => 3 + Math.random() * 5, color: () => `hsla(${15 + Math.random() * 30},100%,${50 + Math.random() * 20}%,`, grow: false },
    cursor_soundwave: { count: 1, life: 55, spd: 0, sz: () => 2, color: () => "rgba(57,255,20,", grow: true, ring: true },
    cursor_meteors: { count: 1, life: 50, spd: 3.5, sz: () => 2.5, color: () => "rgba(255,215,0,", grow: false, meteor: true },
    cursor_leaves: { count: 2, life: 80, spd: 0.9, sz: () => 5 + Math.random() * 4, color: () => `hsl(${100 + Math.random() * 60},${60 + Math.random() * 20}%,${40 + Math.random() * 20}%,`, grow: false, leaf: true },
    cursor_water: { count: 2, life: 50, spd: 1.5, sz: () => 3 + Math.random() * 4, color: () => "rgba(14,165,233,", grow: false },
    cursor_shadow: { count: 1, life: 90, spd: 0.5, sz: () => 4 + Math.random() * 4, color: () => "rgba(168,237,255,", grow: false, soul: true },
    cursor_sparkle: { count: 2, life: 45, spd: 0.8, sz: () => 3 + Math.random() * 3, color: () => `hsla(${45 + Math.random() * 20},95%,65%,`, grow: false, sparkle: true },
    cursor_snow: { count: 1, life: 90, spd: 0.4, sz: () => 2.5 + Math.random() * 3, color: () => "rgba(224,242,254,", grow: false, snow: true },
    cursor_sakura: { count: 1, life: 75, spd: 0.5, sz: () => 4 + Math.random() * 3, color: () => "rgba(249,168,212,", grow: false, leaf: true },
    cursor_hearts: { count: 1, life: 65, spd: 0.6, sz: () => 5 + Math.random() * 3, color: () => "rgba(251,113,133,", grow: false, heart: true },
    cursor_butterflies: { count: 1, life: 80, spd: 0.7, sz: () => 6 + Math.random() * 3, color: () => `hsla(${265 + Math.random() * 40},80%,68%,`, grow: false, butterfly: true },
    cursor_matrix: { count: 1, life: 55, spd: 1, sz: () => 13, color: () => "rgba(57,255,20,", grow: false, matrixchar: true },
  };

  const cfg = configs[CE];
  let raf = 0;
  let stopped = false;
  let onSpawn: ((e: MouseEvent) => void) | null = null;

  if (cfg) {
    const MATRIX_CHARS = "アイウエオカキクケコ0123456789$#%&XYZ";
    function spawnParticle() {
      for (let k = 0; k < cfg.count; k++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = cfg.spd * (0.5 + Math.random() * 0.5);
        particles.push({
          x: mx, y: my,
          vx: cfg.meteor ? -spd * 2.5 : cfg.matrixchar ? 0 : cfg.butterfly ? (Math.random() - 0.5) * 0.3 : Math.cos(angle) * spd * 0.5,
          vy: cfg.meteor ? -spd
            : cfg.snow ? 0.5 + Math.random() * 0.3
            : cfg.heart ? -0.6 - Math.random() * 0.3
            : cfg.matrixchar ? 1 + Math.random() * 0.6
            : cfg.butterfly ? -0.3 - Math.random() * 0.2
            : Math.sin(angle) * spd - (CE === "cursor_fire" ? 1.5 : 0) - (cfg.grow ? 0.2 : 0),
          life: cfg.life, maxLife: cfg.life,
          sz: cfg.sz(), color: cfg.color(),
          rot: Math.random() * Math.PI * 2,
          rspd: (Math.random() - 0.5) * 0.1,
          swayPhase: Math.random() * Math.PI * 2,
          char: cfg.matrixchar ? MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)] : "",
        });
      }
    }
    onSpawn = () => spawnParticle();
    document.addEventListener("mousemove", onSpawn);

    const cursorLoop = () => {
      if (stopped) return;
      pc.clearRect(0, 0, pCanvas.width, pCanvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (cfg.snow) p.vy += 0.008;
        if (cfg.butterfly) p.x += Math.sin(p.life * 0.35 + p.swayPhase) * 1.3;
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        const ratio = p.life / p.maxLife;
        const sz = cfg.grow ? p.sz * (1 + ratio * 1.5) : p.sz * ratio;
        const alpha = ratio * (isShadow ? 0.5 : 0.85);
        pc.save();
        if (cfg.glow) { pc.shadowColor = "#a8edff"; pc.shadowBlur = 16; }
        if (cfg.soul) {
          const sw = p.sz, sh = p.sz * 1.4;
          const wobble = Math.sin(p.life * 0.18) * 0.25;
          pc.globalAlpha = 0.15 * ratio;
          const sg = pc.createRadialGradient(p.x, p.y, 0, p.x, p.y, sw * 2.5);
          sg.addColorStop(0, "#a8edff"); sg.addColorStop(1, "transparent");
          pc.fillStyle = sg; pc.beginPath(); pc.arc(p.x, p.y, sw * 2.5, 0, Math.PI * 2); pc.fill();
          pc.globalAlpha = 0.9 * ratio;
          pc.shadowColor = "#7ee8fa"; pc.shadowBlur = 12;
          pc.fillStyle = "rgba(168,237,255," + ratio + ")";
          pc.beginPath(); pc.ellipse(p.x, p.y, sw, sh, wobble, 0, Math.PI * 2); pc.fill();
          pc.shadowBlur = 0; pc.fillStyle = "#1a0a2e"; pc.globalAlpha = ratio;
          pc.beginPath(); pc.arc(p.x - sw * 0.35, p.y - sh * 0.15, sw * 0.22, 0, Math.PI * 2); pc.fill();
          pc.beginPath(); pc.arc(p.x + sw * 0.35, p.y - sh * 0.15, sw * 0.22, 0, Math.PI * 2); pc.fill();
          for (let d = 1; d <= 3; d++) {
            pc.globalAlpha = (0.4 - d * 0.1) * ratio;
            pc.fillStyle = "rgba(168,237,255,1)"; pc.shadowColor = "#7ee8fa"; pc.shadowBlur = 5;
            pc.beginPath(); pc.arc(p.x + wobble * d * 2, p.y + sh + d * 4, Math.max(0.5, sw * 0.4 - d * 0.2), 0, Math.PI * 2); pc.fill();
          }
        } else if (cfg.ring) {
          const rr = p.sz + (1 - ratio) * 40;
          pc.globalAlpha = ratio * 0.7; pc.strokeStyle = p.color + "0.7)"; pc.lineWidth = 2;
          pc.beginPath(); pc.arc(p.x, p.y, rr, 0, Math.PI * 2); pc.stroke();
        } else if (cfg.leaf) {
          pc.globalAlpha = alpha; pc.fillStyle = p.color + "1)";
          pc.translate(p.x, p.y); pc.rotate(p.rot); p.rot += p.rspd;
          pc.beginPath(); pc.ellipse(0, 0, sz, sz * 0.55, 0, 0, Math.PI * 2); pc.fill();
        } else if (cfg.meteor) {
          const trailLen = 25 + ratio * 15;
          const meteorSpd = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || cfg.spd || 1;
          pc.globalAlpha = alpha; pc.strokeStyle = p.color + "1)"; pc.lineWidth = 2;
          pc.beginPath(); pc.moveTo(p.x, p.y); pc.lineTo(p.x - (p.vx / meteorSpd) * trailLen, p.y - (p.vy / meteorSpd) * trailLen); pc.stroke();
          pc.fillStyle = "#fff"; pc.globalAlpha = ratio;
          pc.beginPath(); pc.arc(p.x, p.y, 2.5, 0, Math.PI * 2); pc.fill();
        } else if (cfg.sparkle) {
          const tw = 0.4 + 0.6 * Math.abs(Math.sin(p.life * 0.5 + p.swayPhase));
          pc.globalAlpha = alpha * tw; pc.strokeStyle = p.color + "1)"; pc.lineWidth = 1.4;
          pc.shadowColor = "#fde047"; pc.shadowBlur = 8;
          const r = sz * (0.6 + tw * 0.6);
          pc.beginPath();
          pc.moveTo(p.x - r, p.y); pc.lineTo(p.x + r, p.y);
          pc.moveTo(p.x, p.y - r); pc.lineTo(p.x, p.y + r);
          pc.stroke();
        } else if (cfg.snow) {
          pc.globalAlpha = alpha; pc.fillStyle = p.color + alpha + ")";
          pc.shadowColor = "#e0f2fe"; pc.shadowBlur = 6;
          pc.beginPath(); pc.arc(p.x, p.y, Math.max(0.5, sz), 0, Math.PI * 2); pc.fill();
        } else if (cfg.heart) {
          pc.globalAlpha = alpha; pc.fillStyle = p.color + "1)";
          const hs = sz * 0.11;
          pc.save(); pc.translate(p.x, p.y); pc.scale(hs, hs);
          pc.beginPath();
          pc.moveTo(0, 3);
          pc.bezierCurveTo(0, 1, -3, -2, -6, -2);
          pc.bezierCurveTo(-10, -2, -10, 3, -6, 6);
          pc.bezierCurveTo(-3, 9, 0, 11, 0, 13);
          pc.bezierCurveTo(0, 11, 3, 9, 6, 6);
          pc.bezierCurveTo(10, 3, 10, -2, 6, -2);
          pc.bezierCurveTo(3, -2, 0, 1, 0, 3);
          pc.fill();
          pc.restore();
        } else if (cfg.butterfly) {
          const flap = Math.sin(p.life * 0.5 + p.swayPhase);
          pc.globalAlpha = alpha; pc.fillStyle = p.color + "1)";
          pc.save(); pc.translate(p.x, p.y);
          pc.save(); pc.scale(0.35 + Math.abs(flap) * 0.65, 1);
          pc.beginPath(); pc.ellipse(-sz * 0.5, 0, sz * 0.6, sz * 0.4, 0, 0, Math.PI * 2); pc.fill();
          pc.beginPath(); pc.ellipse(sz * 0.5, 0, sz * 0.6, sz * 0.4, 0, 0, Math.PI * 2); pc.fill();
          pc.restore();
          pc.fillStyle = "rgba(40,20,50," + alpha + ")";
          pc.beginPath(); pc.ellipse(0, 0, sz * 0.12, sz * 0.5, 0, 0, Math.PI * 2); pc.fill();
          pc.restore();
        } else if (cfg.matrixchar) {
          pc.globalAlpha = alpha; pc.fillStyle = p.color + alpha + ")";
          pc.font = `${p.sz}px monospace`;
          pc.textAlign = "center"; pc.textBaseline = "middle";
          pc.shadowColor = "#39ff14"; pc.shadowBlur = 6;
          pc.fillText(p.char, p.x, p.y);
        } else {
          pc.globalAlpha = alpha; pc.fillStyle = p.color + alpha + ")";
          pc.beginPath(); pc.arc(p.x, p.y, Math.max(0.5, sz), 0, Math.PI * 2); pc.fill();
        }
        pc.restore();
      }
      raf = requestAnimationFrame(cursorLoop);
    };
    cursorLoop();
  }

  return () => {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    document.removeEventListener("mousemove", onMouseMove);
    if (onSpawn) document.removeEventListener("mousemove", onSpawn);
    window.removeEventListener("resize", onResize);
    pCanvas.remove();
  };
}

// ── Custom cursor image (GIF/CUR animated via fake DOM cursor, static via CSS data-URL) ──
function runCustomCursor(url: string): () => void {
  const ext = (url.split(".").pop() || "").toLowerCase().split("?")[0];
  const isAnimated = ext === "gif" || ext === "cur";
  const cleanups: Array<() => void> = [];

  if (isAnimated) {
    const SIZE = 32;
    document.getElementById("custom-cursor-style")?.remove();
    const s = document.createElement("style");
    s.id = "custom-cursor-style";
    s.textContent = `*, *::before, *::after { cursor: none !important; }`;
    document.head.appendChild(s);
    const el = document.createElement("img");
    el.id = "fake-cursor";
    el.src = url;
    el.style.cssText = `position:fixed;top:0;left:0;width:${SIZE}px;height:${SIZE}px;pointer-events:none;z-index:2147483647;transform:translate(-2px,-2px);image-rendering:auto;`;
    document.body.appendChild(el);
    const onMove = (e: MouseEvent) => { el.style.left = e.clientX + "px"; el.style.top = e.clientY + "px"; };
    const onLeave = () => { el.style.display = "none"; };
    const onEnter = () => { el.style.display = ""; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    cleanups.push(() => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      s.remove();
      el.remove();
    });
  } else {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      const SIZE = 32;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = SIZE;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      const dataUrl = canvas.toDataURL("image/png");
      const cursorVal = `url('${dataUrl}') ${SIZE / 2} ${SIZE / 2}, auto`;
      const pointerVal = `url('${dataUrl}') ${SIZE / 2} ${SIZE / 2}, pointer`;
      document.getElementById("custom-cursor-style")?.remove();
      const s = document.createElement("style");
      s.id = "custom-cursor-style";
      s.textContent = `*, *::before, *::after { cursor: ${cursorVal} !important; }\na, button, [onclick], [role="button"], label { cursor: ${pointerVal} !important; }`;
      document.head.appendChild(s);
    };
    img.onerror = function () {};
    img.src = url;
    cleanups.push(() => { document.getElementById("custom-cursor-style")?.remove(); });
  }

  return () => cleanups.forEach((fn) => fn());
}

// ── Component ────────────────────────────────────────────────────────────────
export default function PurchasedEffectsEngine({
  purchasedEffects,
  activeCursorEffect,
  activeBgEffect,
  cursorTrailEnabled,
  customCursorUrl,
}: Props) {
  useEffect(() => {
    const purchased = purchasedEffects || [];
    const cleanups: Array<() => void> = [];

    if (activeBgEffect && purchased.includes(activeBgEffect)) {
      cleanups.push(runBgEffect(activeBgEffect));
    }
    if (activeCursorEffect && purchased.includes(activeCursorEffect) && !cursorTrailEnabled && !("ontouchstart" in window)) {
      const c = runCursorEffect(activeCursorEffect);
      if (c) cleanups.push(c);
    }
    if (customCursorUrl && !("ontouchstart" in window)) {
      cleanups.push(runCustomCursor(customCursorUrl));
    }

    return () => cleanups.forEach((fn) => fn());
  }, [purchasedEffects, activeCursorEffect, activeBgEffect, cursorTrailEnabled, customCursorUrl]);

  return null;
}
