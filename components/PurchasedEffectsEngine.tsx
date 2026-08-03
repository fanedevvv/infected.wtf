"use client";

import { useEffect } from "react";

interface Props {
  purchasedEffects: string[];
  activeCursorEffect: string;
  activeAvatarEffect: string;
  activeBgEffect: string;
  avatarShape: string;
  cursorTrailEnabled: boolean;
  customCursorUrl: string | null;
}

type Renderer = (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => void;

// ── Background effects ──────────────────────────────────────────────────────
function buildBgRenderers(): Record<string, Renderer> {
  let hellSeeds: any = null;

  return {
    bg_fallingleaves: (() => {
      const LEAF_COUNT = 28;
      let seeds: any = null;
      function initSeeds() {
        seeds = Array.from({ length: LEAF_COUNT }, (_, i) => ({
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
        if (!seeds) initSeeds();
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
      let bubbles: any = null;
      function initBubbles(W: number) {
        bubbles = Array.from({ length: BCOUNT }, () => ({
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
        if (!bubbles) initBubbles(W);
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
        const [c1, c2] = palettes[i % palettes.length];
        grd.addColorStop(0, c1 + "44"); grd.addColorStop(1, "transparent");
        ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    },

    bg_fireworks: (() => {
      const bursts: any[] = [];
      const COLORS = ["#ffd700", "#f97316", "#ef4444", "#a78bfa", "#34d399", "#60a5fa", "#f472b6", "#facc15"];
      let lastBurst = 0;
      function spawnBurst(W: number, H: number) {
        const x = W * (0.15 + Math.random() * 0.7);
        const y = H * (0.1 + Math.random() * 0.6);
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const count = 28 + Math.floor(Math.random() * 16);
        const speed = 2.2 + Math.random() * 2.5;
        const particles: any[] = [];
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
          p === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
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

// ── Avatar canvas effects ───────────────────────────────────────────────────
const SHAPE_RADIUS: Record<string, number> = { circle: 9999, square: 8, soft: 22, rounded: 36, egg: 9999, eye: 9999, diamond: 0 };
const CIRCLE_ORBIT = new Set(["circle", "egg"]);
const SHAPE_POLYGONS: Record<string, number[][]> = {
  eye: [[.00, .50], [.10, .30], [.25, .15], [.50, .05], [.75, .15], [.90, .30], [1.0, .50], [.90, .70], [.75, .85], [.50, .95], [.25, .85], [.10, .70]],
  diamond: [[.50, .00], [1.0, .50], [.50, 1.00], [.00, .50]],
};

function polygonBorderPoints(cx: number, cy: number, W: number, H: number, polyNorm: number[][], n: number) {
  const poly = polyNorm.map(([px, py]) => ({ x: cx + (px - 0.5) * W, y: cy + (py - 0.5) * H }));
  const lens = poly.map((p, i) => {
    const q = poly[(i + 1) % poly.length];
    return Math.hypot(q.x - p.x, q.y - p.y);
  });
  const total = lens.reduce((a, b) => a + b, 0);
  const pts: any[] = [];
  for (let i = 0; i < n; i++) {
    let dist = (i / n) * total;
    let si = 0;
    while (si < lens.length - 1 && dist > lens[si]) { dist -= lens[si]; si++; }
    const p0 = poly[si], p1 = poly[(si + 1) % poly.length];
    const t2 = lens[si] > 0 ? dist / lens[si] : 0;
    const px = p0.x + (p1.x - p0.x) * t2;
    const py = p0.y + (p1.y - p0.y) * t2;
    pts.push({ x: px, y: py, a: Math.atan2(py - cy, px - cx) });
  }
  return pts;
}

function perimPoint(cx: number, cy: number, hw: number, hh: number, cr: number, t: number) {
  const s = hw - cr;
  const arcLen = cr * Math.PI / 2;
  const segs: any[] = [
    { type: "arc", cx: cx - s, cy: cy - hh + cr, r: cr, a0: -Math.PI / 2, da: -Math.PI / 2 },
    { type: "line", x0: cx - s, y0: cy - hh, x1: cx + s, y1: cy - hh },
    { type: "arc", cx: cx + s, cy: cy - hh + cr, r: cr, a0: -Math.PI / 2, da: Math.PI / 2 },
    { type: "line", x0: cx + hw, y0: cy - s, x1: cx + hw, y1: cy + s },
    { type: "arc", cx: cx + s, cy: cy + hh - cr, r: cr, a0: 0, da: Math.PI / 2 },
    { type: "line", x0: cx + s, y0: cy + hh, x1: cx - s, y1: cy + hh },
    { type: "arc", cx: cx - s, cy: cy + hh - cr, r: cr, a0: Math.PI / 2, da: Math.PI / 2 },
    { type: "line", x0: cx - hw, y0: cy + s, x1: cx - hw, y1: cy - s },
  ];
  const lens = segs.map((sg) => (sg.type === "arc" ? arcLen : Math.hypot(sg.x1 - sg.x0, sg.y1 - sg.y0)));
  const total2 = lens.reduce((a, b) => a + b, 0);
  let rem = ((t % total2) + total2) % total2;
  for (let i = 0; i < segs.length; i++) {
    if (rem <= lens[i]) {
      const sg = segs[i], p = rem / lens[i];
      if (sg.type === "arc") {
        const a = sg.a0 + sg.da * p;
        return { x: sg.cx + Math.cos(a) * sg.r, y: sg.cy + Math.sin(a) * sg.r, a };
      } else {
        const a = Math.atan2(sg.y1 - sg.y0, sg.x1 - sg.x0);
        return { x: sg.x0 + (sg.x1 - sg.x0) * p, y: sg.y0 + (sg.y1 - sg.y0) * p, a };
      }
    }
    rem -= lens[i];
  }
  return { x: cx, y: cy - hh, a: 0 };
}

function buildAvatarHelpers(SHAPE: string) {
  const SR = SHAPE_RADIUS[SHAPE] ?? 9999;

  function getBorderPoints(cx: number, cy: number, R: number, n: number): any[] {
    if (SHAPE_POLYGONS[SHAPE]) {
      return polygonBorderPoints(cx, cy, R * 2, R * 2, SHAPE_POLYGONS[SHAPE], n);
    } else if (CIRCLE_ORBIT.has(SHAPE)) {
      const pts: any[] = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        pts.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, a });
      }
      return pts;
    } else if (SHAPE === "diamond") {
      const side = R * Math.SQRT2;
      const total = side * 4;
      const corners = [
        { x: cx, y: cy - R },
        { x: cx + R, y: cy },
        { x: cx, y: cy + R },
        { x: cx - R, y: cy },
      ];
      const pts: any[] = [];
      for (let i = 0; i < n; i++) {
        const t = (i / n) * total;
        const seg = Math.floor(t / side);
        const p = (t % side) / side;
        const c0 = corners[seg % 4];
        const c1 = corners[(seg + 1) % 4];
        const px = c0.x + (c1.x - c0.x) * p;
        const py = c0.y + (c1.y - c0.y) * p;
        pts.push({ x: px, y: py, a: Math.atan2(py - cy, px - cx) });
      }
      return pts;
    } else {
      const hw = R, hh = R;
      const cr = Math.min(SR, hw * 0.6);
      const straight = (hw - cr) * 2;
      const arc = cr * Math.PI / 2;
      const total = straight * 4 + arc * 4;
      const pts: any[] = [];
      for (let i = 0; i < n; i++) {
        const t = (i / n) * total;
        pts.push(perimPoint(cx, cy, hw, hh, cr, t));
      }
      return pts;
    }
  }

  function drawShapeRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, color: string, lineW: number, blur?: number, dash?: number[]) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.shadowColor = color;
    ctx.shadowBlur = blur || 0;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    if (SHAPE_POLYGONS[SHAPE]) {
      const poly = SHAPE_POLYGONS[SHAPE];
      poly.forEach(([px, py], i) => {
        const x = cx + (px - 0.5) * R * 2;
        const y = cy + (py - 0.5) * R * 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
    } else if (CIRCLE_ORBIT.has(SHAPE)) {
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
    } else if (SHAPE === "diamond") {
      ctx.moveTo(cx, cy - R);
      ctx.lineTo(cx + R, cy);
      ctx.lineTo(cx, cy + R);
      ctx.lineTo(cx - R, cy);
      ctx.closePath();
    } else {
      const cr = Math.min(SR, R * 0.6);
      const s = R - cr;
      ctx.moveTo(cx - s, cy - R);
      ctx.lineTo(cx + s, cy - R);
      ctx.arcTo(cx + R, cy - R, cx + R, cy - s, cr);
      ctx.lineTo(cx + R, cy + s);
      ctx.arcTo(cx + R, cy + R, cx + s, cy + R, cr);
      ctx.lineTo(cx - s, cy + R);
      ctx.arcTo(cx - R, cy + R, cx - R, cy + s, cr);
      ctx.lineTo(cx - R, cy - s);
      ctx.arcTo(cx - R, cy - R, cx - s, cy - R, cr);
      ctx.closePath();
    }
    ctx.stroke();
    if (dash) ctx.setLineDash([]);
    ctx.restore();
    ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
  }

  return { getBorderPoints, drawShapeRing };
}

function buildAvatarRenderers(SHAPE: string, PAV_TOP_OFFSET: number, PAV_EDGE: number): Record<string, Renderer> {
  const { getBorderPoints, drawShapeRing } = buildAvatarHelpers(SHAPE);
  function getAvatarCY(H: number) { return PAV_TOP_OFFSET + (H - PAV_TOP_OFFSET - PAV_EDGE) / 2; }
  function getAvatarR(H: number) { return (H - PAV_TOP_OFFSET - PAV_EDGE) / 2 - 2; }
  function getEffectR(W: number, H: number) { return H ? getAvatarR(H) : W * 0.48; }

  let avDarkEyesCache: any = null;

  return {
    avatar_rocks: (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = getAvatarCY(H), R = getEffectR(W, H);
      const count = 8;
      const pts = getBorderPoints(cx, cy, R, count);
      for (let i = 0; i < count; i++) {
        const idxF = ((t * 0.003 * count + i) % count + count) % count;
        const idxA = Math.floor(idxF);
        const idxB = (idxA + 1) % count;
        const frac = idxF - idxA;
        const pA = pts[idxA], pB = pts[idxB];
        const px = pA.x + (pB.x - pA.x) * frac;
        const py = pA.y + (pB.y - pA.y) * frac;
        const pa = pA.a + (pB.a - pA.a) * frac;
        const sz = 4 + Math.sin(i * 1.3) * 2;
        ctx.save(); ctx.globalAlpha = 0.88; ctx.fillStyle = i % 2 ? "#a8a29e" : "#78716c";
        ctx.translate(px, py); ctx.rotate(pa + t * 0.02);
        ctx.beginPath(); ctx.ellipse(0, 0, sz, sz * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    },

    avatar_crown: (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2;
      const bob = Math.sin(t * 0.04) * 3;
      const baseY = H * 0.30 - bob;
      const s = W * 0.14;

      const glowR = s * 1.05;
      const pulse = 0.12 + Math.sin(t * 0.05) * 0.05;
      const grd = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, glowR);
      grd.addColorStop(0, `rgba(255,200,0,${pulse})`);
      grd.addColorStop(1, "transparent");
      ctx.save(); ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx, baseY, glowR, 0, Math.PI * 2); ctx.fill(); ctx.restore();

      const bH = s * 0.3;
      const bY = baseY + s * 0.45;
      const bL = cx - s, bR = cx + s;
      const lx = cx - s * 0.6, rx = cx + s * 0.6;
      const cSH = s * 1.05, sSH = s * 0.68;
      const cSW = s * 0.27, sSW = s * 0.21;

      const mf = ctx.createLinearGradient(cx, bY - cSH, cx, bY + bH);
      mf.addColorStop(0, "rgba(255,240,90,0.95)");
      mf.addColorStop(0.25, "rgba(255,205,20,0.92)");
      mf.addColorStop(0.65, "rgba(200,145,0,0.88)");
      mf.addColorStop(1, "rgba(150,100,0,0.82)");

      ctx.save();
      ctx.shadowColor = "#ffc200"; ctx.shadowBlur = 8;
      ctx.strokeStyle = "#b8860b"; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.98;
      ctx.fillStyle = mf;
      ctx.beginPath();
      ctx.moveTo(bL, bY + bH);
      ctx.lineTo(bL, bY);
      ctx.lineTo(lx - sSW / 2, bY);
      ctx.lineTo(lx - sSW / 2, bY - sSH);
      ctx.lineTo(lx + sSW / 2, bY - sSH);
      ctx.lineTo(lx + sSW / 2, bY);
      ctx.lineTo(cx - cSW / 2, bY);
      ctx.lineTo(cx - cSW / 2, bY - cSH);
      ctx.lineTo(cx + cSW / 2, bY - cSH);
      ctx.lineTo(cx + cSW / 2, bY);
      ctx.lineTo(rx - sSW / 2, bY);
      ctx.lineTo(rx - sSW / 2, bY - sSH);
      ctx.lineTo(rx + sSW / 2, bY - sSH);
      ctx.lineTo(rx + sSW / 2, bY);
      ctx.lineTo(bR, bY);
      ctx.lineTo(bR, bY + bH);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();

      ctx.save(); ctx.globalAlpha = 0.13;
      const sh = ctx.createLinearGradient(bL, 0, bR, 0);
      sh.addColorStop(0, "transparent"); sh.addColorStop(0.42, "rgba(255,255,220,0.9)");
      sh.addColorStop(0.58, "rgba(255,255,220,0.9)"); sh.addColorStop(1, "transparent");
      ctx.fillStyle = sh; ctx.fillRect(bL, bY - cSH, s * 2, cSH + bH); ctx.restore();

      const orbR = s * 0.13;
      ([[lx, bY - sSH, "#c084fc", "#7e22ce"],
        [cx, bY - cSH, "#fbbf24", "#b45309"],
        [rx, bY - sSH, "#60a5fa", "#1d4ed8"]] as [number, number, string, string][]).forEach(([ox, oy, c, gc]) => {
        ctx.save();
        ctx.shadowColor = gc; ctx.shadowBlur = 10; ctx.globalAlpha = 0.97;
        const og = ctx.createRadialGradient(ox - orbR * 0.35, oy - orbR * 0.38, orbR * 0.08, ox, oy, orbR);
        og.addColorStop(0, "rgba(255,255,255,0.75)");
        og.addColorStop(0.35, c); og.addColorStop(1, gc);
        ctx.fillStyle = og;
        ctx.beginPath(); ctx.arc(ox, oy, orbR, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = gc; ctx.lineWidth = 0.9; ctx.stroke();
        ctx.restore();
      });

      ctx.save();
      ctx.shadowColor = "#ff4444"; ctx.shadowBlur = 8; ctx.globalAlpha = 0.92;
      ctx.fillStyle = "#f87171";
      const gx = cx, gy = bY + bH * 0.5;
      ctx.beginPath(); ctx.moveTo(gx, gy - 4.5); ctx.lineTo(gx + 3.5, gy); ctx.lineTo(gx, gy + 4.5); ctx.lineTo(gx - 3.5, gy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(gx - 0.9, gy - 1.4, 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },

    avatar_bloodrain: (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = getAvatarCY(H);
      const R = getEffectR(W, H);

      const segments = 80;
      if (SHAPE === "circle") {
        for (let i = 0; i < segments; i++) {
          const a1 = (i / segments) * Math.PI * 2;
          const a2 = ((i + 1) / segments) * Math.PI * 2;
          const cycle = (i / segments + t * 0.004) % 1;
          const hue = cycle < 0.5 ? cycle * 2 * 20 : 20 - (cycle - 0.5) * 2 * 20;
          const sat = 88 + Math.sin(cycle * Math.PI * 2 + t * 0.03) * 6;
          const light = 20 + Math.sin((i / segments) * Math.PI * 4 + t * 0.05) * 8;
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, R, a1, a2);
          ctx.arc(cx, cy, R - 5, a2, a1, true);
          ctx.closePath();
          ctx.fillStyle = "hsl(" + hue + "," + sat + "%," + light + "%)";
          ctx.globalAlpha = 0.95;
          ctx.fill();
          ctx.restore();
        }
      } else if (SHAPE_POLYGONS[SHAPE]) {
        const borderPts = polygonBorderPoints(cx, cy, R * 2, R * 2, SHAPE_POLYGONS[SHAPE], segments);
        for (let i = 0; i < segments; i++) {
          const p0 = borderPts[i], p1 = borderPts[(i + 1) % segments];
          const cycle = (i / segments + t * 0.004) % 1;
          const hue = cycle < 0.5 ? cycle * 2 * 20 : 20 - (cycle - 0.5) * 2 * 20;
          const sat = 88 + Math.sin(cycle * Math.PI * 2 + t * 0.03) * 6;
          const light = 20 + Math.sin((i / segments) * Math.PI * 4 + t * 0.05) * 8;
          ctx.save();
          ctx.strokeStyle = "hsl(" + hue + "," + sat + "%," + light + "%)";
          ctx.lineWidth = 6;
          ctx.globalAlpha = 0.95;
          ctx.shadowColor = "#8b0000";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
          ctx.restore();
        }
        drawShapeRing(ctx, cx, cy, R, "rgba(160,10,10,0.45)", 3, 16);
      } else {
        drawShapeRing(ctx, cx, cy, R, "hsl(0,88%,22%)", 7, 16);
        drawShapeRing(ctx, cx, cy, R, "hsl(12,85%,30%)", 3, 6);
      }
      if (SHAPE === "circle") {
        drawShapeRing(ctx, cx, cy, R, "rgba(160,10,10,0.5)", 6, 18);
        drawShapeRing(ctx, cx, cy, R - 5, "rgba(200,60,10,0.2)", 2, 6);
      }

      const dropCount = 22;
      const spawnPts = getBorderPoints(cx, cy, R, dropCount * 3);
      for (let i = 0; i < dropCount; i++) {
        const sp = spawnPts[Math.floor((i / dropCount) * spawnPts.length)];
        if (!sp || sp.y < cy - R * 0.25) continue;
        const speed = 0.9 + Math.sin(i * 1.3) * 0.3;
        const prog = ((t * speed + i * 8.7) % 100) / 100;
        const maxDrop = H * 0.45;
        const dy = prog * maxDrop;
        const op = prog < 0.08 ? prog / 0.08 : Math.max(0, 1 - prog * 1.1);
        const thick = 3.5 * (1 - prog * 0.35) + 0.5;
        const dropLen = 12 + Math.sin(i * 2.1) * 5 + prog * 8;
        const dHue = i % 4 === 0 ? 12 : i % 4 === 1 ? 4 : i % 4 === 2 ? 18 : 0;
        const dLight = 32 + Math.sin(i * 0.7) * 8;
        ctx.save();
        ctx.globalAlpha = op * 0.95;
        ctx.shadowColor = "#cc0000"; ctx.shadowBlur = 10;
        const grad = ctx.createLinearGradient(sp.x, sp.y + dy, sp.x, sp.y + dy + dropLen);
        grad.addColorStop(0, "hsl(" + dHue + ",95%," + dLight + "%)");
        grad.addColorStop(1, "hsl(" + dHue + ",90%," + Math.max(18, dLight - 10) + "%)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = thick; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(sp.x, sp.y + dy); ctx.lineTo(sp.x, sp.y + dy + dropLen); ctx.stroke();
        ctx.fillStyle = "hsl(" + dHue + ",92%," + dLight + "%)";
        ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.ellipse(sp.x, sp.y + dy + dropLen, thick * 1.1, thick * 1.7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = op * 0.4;
        ctx.fillStyle = "rgba(255,150,150,0.8)";
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.ellipse(sp.x - thick * 0.25, sp.y + dy + dropLen - thick * 0.4, thick * 0.28, thick * 0.38, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    },

    avatar_darkeyes: (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = getAvatarCY(H);
      const R = getEffectR(W, H);

      drawShapeRing(ctx, cx, cy, R, "rgba(124,58,237,0.41)", 1.5, 8, [4, 6]);
      ctx.shadowBlur = 0; ctx.shadowColor = "transparent";

      if (!avDarkEyesCache || avDarkEyesCache.W !== W || avDarkEyesCache.H !== H) {
        avDarkEyesCache = { W, H, pts: getBorderPoints(cx, cy, R, 200) };
      }

      const speed = 0.004;
      const blink1 = Math.max(0, Math.sin(t * 0.07) > 0.96 ? (Math.sin(t * 0.07) - 0.96) / 0.04 : 0);
      const blink2 = Math.max(0, Math.sin(t * 0.07 + Math.PI) > 0.96 ? (Math.sin(t * 0.07 + Math.PI) - 0.96) / 0.04 : 0);
      const orbitPts = avDarkEyesCache.pts;
      const orbitRes = orbitPts.length;
      const idx1 = Math.floor((((t * speed * orbitRes) / (Math.PI * 2)) % orbitRes + orbitRes) % orbitRes);
      const idx2 = (idx1 + Math.floor(orbitRes / 2)) % orbitRes;
      const p1 = orbitPts[idx1], p2 = orbitPts[idx2];

      function drawEye(ex: number, ey: number, angle: number, blinkProg: number, scale: number) {
        const ew = W * 0.13 * scale;
        const eh = ew * 0.42;
        const blinkSY = 1 - blinkProg * 0.97;

        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(angle + Math.PI / 2);
        ctx.scale(1, blinkSY);

        const grd = ctx.createRadialGradient(0, 0, ew * 0.3, 0, 0, ew * 1.3);
        grd.addColorStop(0, "rgba(124,58,237,0.17)");
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.ellipse(0, 0, ew * 1.3, eh * 1.3, 0, 0, Math.PI * 2); ctx.fill();

        ctx.save();
        ctx.shadowColor = "#7c3aed"; ctx.shadowBlur = 10;
        ctx.fillStyle = "#6d28d9";
        ctx.beginPath();
        ctx.moveTo(-ew, 0);
        ctx.bezierCurveTo(-ew, -eh * 1.5, ew, -eh * 1.5, ew, 0);
        ctx.bezierCurveTo(ew, eh * 1.5, -ew, eh * 1.5, -ew, 0);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "#a78bfa";
        ctx.beginPath();
        ctx.moveTo(-ew * 0.5, 0);
        ctx.bezierCurveTo(-ew * 0.5, -eh * 0.9, ew * 0.5, -eh * 0.9, ew * 0.5, 0);
        ctx.bezierCurveTo(ew * 0.5, eh * 0.9, -ew * 0.5, eh * 0.9, -ew * 0.5, 0);
        ctx.fill();
        ctx.restore();

        const pw = ew * 0.13, ph = eh * 0.85;
        ctx.save();
        ctx.shadowColor = "#000"; ctx.shadowBlur = 4;
        ctx.fillStyle = "#0a0010";
        ctx.beginPath();
        ctx.moveTo(0, -ph);
        ctx.bezierCurveTo(pw, -ph * 0.4, pw, ph * 0.4, 0, ph);
        ctx.bezierCurveTo(-pw, ph * 0.4, -pw, -ph * 0.4, 0, -ph);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = "rgba(109,40,217,0.7)";
        ctx.lineWidth = 1.2;
        ctx.shadowColor = "#7c3aed"; ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(-ew, 0);
        ctx.bezierCurveTo(-ew, -eh * 1.5, ew, -eh * 1.5, ew, 0);
        ctx.bezierCurveTo(ew, eh * 1.5, -ew, eh * 1.5, -ew, 0);
        ctx.stroke();
        ctx.restore();

        ctx.restore();
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
      }

      drawEye(p1.x, p1.y, p1.a, blink1, 1);
      drawEye(p2.x, p2.y, p2.a, blink2, 0.85);
      ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
    },
  };
}

function runAvatarEffect(AE: string, avatarShape: string): (() => void) | null {
  const el = document.getElementById("pav-canvas") as HTMLCanvasElement | null;
  if (!el) return null;
  const avCanvas: HTMLCanvasElement = el;
  const ctx = avCanvas.getContext("2d")!;
  function sizeAv() {
    const r = avCanvas.getBoundingClientRect();
    avCanvas.width = r.width || 240;
    avCanvas.height = r.height || 240;
  }
  sizeAv();
  const PAV_TOP_OFFSET = 60, PAV_EDGE = 12;

  const avRenderers = buildAvatarRenderers(avatarShape, PAV_TOP_OFFSET, PAV_EDGE);
  let avFrame = 0;
  let raf = 0;
  let stopped = false;
  if (avRenderers[AE]) {
    const loop = () => {
      if (stopped) return;
      avFrame = (avFrame + 1) % 1000000;
      avRenderers[AE](ctx, avCanvas.width, avCanvas.height, avFrame);
      raf = requestAnimationFrame(loop);
    };
    loop();
  }

  return () => {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
  };
}

// ── Cursor trail effects ────────────────────────────────────────────────────
function runCursorEffect(CE: string): (() => void) | null {
  const isShadow = CE === "cursor_shadow";
  const particles: any[] = [];
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

  const configs: Record<string, any> = {
    cursor_smoke: { count: 2, life: 60, spd: 1.2, sz: () => 4 + Math.random() * 6, color: () => `hsla(0,0%,${60 + Math.random() * 20}%,`, grow: true },
    cursor_fire: { count: 3, life: 40, spd: 1.8, sz: () => 3 + Math.random() * 5, color: () => `hsla(${15 + Math.random() * 30},100%,${50 + Math.random() * 20}%,`, grow: false },
    cursor_soundwave: { count: 1, life: 55, spd: 0, sz: () => 2, color: () => "rgba(0,212,255,", grow: true, ring: true },
    cursor_meteors: { count: 1, life: 50, spd: 3.5, sz: () => 2.5, color: () => "rgba(255,215,0,", grow: false, meteor: true },
    cursor_leaves: { count: 2, life: 80, spd: 0.9, sz: () => 5 + Math.random() * 4, color: () => `hsl(${100 + Math.random() * 60},${60 + Math.random() * 20}%,${40 + Math.random() * 20}%,`, grow: false, leaf: true },
    cursor_water: { count: 2, life: 50, spd: 1.5, sz: () => 3 + Math.random() * 4, color: () => "rgba(14,165,233,", grow: false },
    cursor_shadow: { count: 1, life: 90, spd: 0.5, sz: () => 4 + Math.random() * 4, color: () => "rgba(168,237,255,", grow: false, soul: true },
  };

  const cfg = configs[CE];
  let raf = 0;
  let stopped = false;
  let onSpawn: ((e: MouseEvent) => void) | null = null;

  if (cfg) {
    function spawnParticle() {
      for (let k = 0; k < cfg.count; k++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = cfg.spd * (0.5 + Math.random() * 0.5);
        particles.push({
          x: mx, y: my,
          vx: cfg.meteor ? -spd * 2.5 : Math.cos(angle) * spd * 0.5,
          vy: cfg.meteor ? -spd : Math.sin(angle) * spd - (CE === "cursor_fire" ? 1.5 : 0) - (cfg.grow ? 0.2 : 0),
          life: cfg.life, maxLife: cfg.life,
          sz: cfg.sz(), color: cfg.color(),
          rot: Math.random() * Math.PI * 2,
          rspd: (Math.random() - 0.5) * 0.1,
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
  activeAvatarEffect,
  activeBgEffect,
  avatarShape,
  cursorTrailEnabled,
  customCursorUrl,
}: Props) {
  useEffect(() => {
    const purchased = purchasedEffects || [];
    const cleanups: Array<() => void> = [];

    if (activeBgEffect && purchased.includes(activeBgEffect)) {
      cleanups.push(runBgEffect(activeBgEffect));
    }
    if (activeAvatarEffect && purchased.includes(activeAvatarEffect)) {
      const c = runAvatarEffect(activeAvatarEffect, avatarShape);
      if (c) cleanups.push(c);
    }
    if (activeCursorEffect && purchased.includes(activeCursorEffect) && !cursorTrailEnabled && !("ontouchstart" in window)) {
      const c = runCursorEffect(activeCursorEffect);
      if (c) cleanups.push(c);
    }
    if (customCursorUrl && !("ontouchstart" in window)) {
      cleanups.push(runCustomCursor(customCursorUrl));
    }

    return () => cleanups.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchasedEffects, activeCursorEffect, activeAvatarEffect, activeBgEffect, avatarShape, cursorTrailEnabled, customCursorUrl]);

  return null;
}
