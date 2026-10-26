"use client";

import { useEffect, useRef } from "react";

type Renderer = (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => void;

function buildRenderers(): Record<string, Renderer> {
  return {
    cursor_smoke: (ctx, W, H, t) => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < 12; i++) {
        const a = ((t * 0.4 + i * 30) % 360) * Math.PI / 180;
        const x = W / 2 + Math.cos(a) * 18 + Math.cos(a * 1.7) * 10;
        const y = H / 2 + Math.sin(a) * 12;
        const sz = 3 + Math.abs(Math.sin(t * 0.02 + i)) * 6;
        const op = 0.15 + Math.abs(Math.sin(t * 0.015 + i * 0.5)) * 0.3;
        ctx.save(); ctx.globalAlpha = op; ctx.fillStyle = "#aaa";
        ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    },
    cursor_fire: (ctx, W, H, t) => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < 18; i++) {
        const age = (t * 2 + i * 20) % 100;
        const x = W / 2 + Math.sin(i * 1.7 + t * 0.03) * 22 * (1 - age / 100);
        const y = H / 2 + 10 - age * 0.7;
        const sz = (7 - age * 0.05) * 0.8;
        const r = 255, g = Math.floor(50 + age * 2), b = 0;
        const op = Math.max(0, (1 - age / 100) * 0.85);
        ctx.save(); ctx.globalAlpha = op; ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, sz), 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    },
    cursor_soundwave: (ctx, W, H, t) => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < 4; i++) {
        const r = ((t + i * 25) % 100) * 0.65;
        const op = Math.max(0, 1 - r / 65) * 0.7;
        ctx.save(); ctx.globalAlpha = op; ctx.strokeStyle = "#39ff14"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
    },
    cursor_meteors: (ctx, W, H, t) => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < 6; i++) {
        const prog = ((t * 1.5 + i * 17) % 100) / 100;
        const x = 5 + prog * (W - 10);
        const y = 10 + prog * (H - 20);
        ctx.save(); ctx.globalAlpha = 1 - prog;
        ctx.strokeStyle = "#ffd700"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - prog * 25, y - prog * 15); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    },
    cursor_leaves: (ctx, W, H, t) => {
      ctx.clearRect(0, 0, W, H);
      const colors = ["#4caf50", "#8bc34a", "#cddc39", "#66bb6a"];
      for (let i = 0; i < 8; i++) {
        const a = (t * 0.5 + i * 45) * Math.PI / 180;
        const r = 25 + Math.sin(t * 0.03 + i) * 8;
        const x = W / 2 + Math.cos(a) * r;
        const y = H / 2 + Math.sin(a) * r * 0.6;
        ctx.save(); ctx.globalAlpha = 0.8; ctx.fillStyle = colors[i % colors.length];
        ctx.translate(x, y); ctx.rotate(a + t * 0.02);
        ctx.beginPath(); ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    },
    cursor_water: (ctx, W, H, t) => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < 10; i++) {
        const age = (t * 1.8 + i * 10) % 100;
        const x = W / 2 + Math.sin(i * 0.9 + t * 0.02) * 20 * (1 - age / 100);
        const y = H / 2 + age * 0.35 - 10;
        const sz = Math.max(0.5, 4 * (1 - age / 100));
        const op = Math.max(0, (1 - age / 100) * 0.9);
        ctx.save(); ctx.globalAlpha = op; ctx.fillStyle = "#0ea5e9";
        ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    },
    cursor_shadow: (ctx, W, H, t) => {
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      const souls = [
        { ox: -22, oy: 8, phase: 0 },
        { ox: 20, oy: -12, phase: 1.8 },
        { ox: 5, oy: 20, phase: 3.6 },
        { ox: -10, oy: -18, phase: 2.5 },
        { ox: 28, oy: 14, phase: 4.8 },
      ];
      souls.forEach((s) => {
        const drift = Math.sin(t * 0.035 + s.phase);
        const bob = Math.cos(t * 0.028 + s.phase) * 4;
        const sx = cx + s.ox + drift * 5;
        const sy = cy + s.oy + bob;
        const pulse = 0.7 + Math.sin(t * 0.05 + s.phase) * 0.3;
        ctx.save();
        ctx.globalAlpha = 0.18 * pulse;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10);
        g.addColorStop(0, "#a8edff"); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.88 * pulse;
        ctx.shadowColor = "#7ee8fa"; ctx.shadowBlur = 10;
        ctx.fillStyle = "#a8edff";
        ctx.beginPath();
        ctx.ellipse(sx, sy, 4, 5.5, drift * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a0a2e";
        ctx.globalAlpha = 0.9 * pulse;
        ctx.beginPath(); ctx.arc(sx - 1.5, sy - 1, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + 1.5, sy - 1, 1, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        for (let d = 1; d <= 3; d++) {
          ctx.save();
          ctx.globalAlpha = (0.45 - d * 0.12) * pulse;
          ctx.fillStyle = "#a8edff";
          ctx.shadowColor = "#7ee8fa"; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.arc(sx + drift * d * 0.4, sy + 5 + d * 4, 2.2 - d * 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      });
      ctx.save(); ctx.globalAlpha = 0.06;
      const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 38);
      fg.addColorStop(0, "#a8edff"); fg.addColorStop(1, "transparent");
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, cy, 38, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    },
    avatar_rocks: (ctx, W, H, t) => {
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      ctx.save(); ctx.globalAlpha = 0.25; ctx.strokeStyle = "#78716c"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      for (let i = 0; i < 6; i++) {
        const a = (t * 0.8 + i * 60) * Math.PI / 180;
        const x = cx + Math.cos(a) * 28, y = cy + Math.sin(a) * 28;
        ctx.save(); ctx.fillStyle = "#a8a29e"; ctx.globalAlpha = 0.9;
        ctx.translate(x, y); ctx.rotate(a);
        ctx.beginPath(); ctx.ellipse(0, 0, 4, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    },
    avatar_crown: (ctx, W, H, t) => {
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2;
      const bob = Math.sin(t * 0.04) * 2.5;
      const baseY = H * 0.28 - bob;
      const s = Math.min(W, H) * 0.13;

      const glowR = s * 1.0;
      const pulse = 0.12 + Math.sin(t * 0.05) * 0.05;
      const grd = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, glowR);
      grd.addColorStop(0, `rgba(255,200,0,${pulse})`);
      grd.addColorStop(1, "transparent");
      ctx.save(); ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx, baseY, glowR, 0, Math.PI * 2); ctx.fill(); ctx.restore();

      const bH = s * 0.3, bY = baseY + s * 0.45;
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
      ctx.shadowColor = "#ffc200"; ctx.shadowBlur = 7;
      ctx.strokeStyle = "#b8860b"; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.98;
      ctx.fillStyle = mf;
      ctx.beginPath();
      ctx.moveTo(bL, bY + bH); ctx.lineTo(bL, bY);
      ctx.lineTo(lx - sSW / 2, bY); ctx.lineTo(lx - sSW / 2, bY - sSH);
      ctx.lineTo(lx + sSW / 2, bY - sSH); ctx.lineTo(lx + sSW / 2, bY);
      ctx.lineTo(cx - cSW / 2, bY); ctx.lineTo(cx - cSW / 2, bY - cSH);
      ctx.lineTo(cx + cSW / 2, bY - cSH); ctx.lineTo(cx + cSW / 2, bY);
      ctx.lineTo(rx - sSW / 2, bY); ctx.lineTo(rx - sSW / 2, bY - sSH);
      ctx.lineTo(rx + sSW / 2, bY - sSH); ctx.lineTo(rx + sSW / 2, bY);
      ctx.lineTo(bR, bY); ctx.lineTo(bR, bY + bH);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();

      ctx.save(); ctx.globalAlpha = 0.12;
      const sh = ctx.createLinearGradient(bL, 0, bR, 0);
      sh.addColorStop(0, "transparent"); sh.addColorStop(0.42, "rgba(255,255,220,0.9)");
      sh.addColorStop(0.58, "rgba(255,255,220,0.9)"); sh.addColorStop(1, "transparent");
      ctx.fillStyle = sh; ctx.fillRect(bL, bY - cSH, s * 2, cSH + bH); ctx.restore();

      const orbR = s * 0.13;
      ([{ x: lx, y: bY - sSH, c: "#c084fc", gc: "#7e22ce" },
        { x: cx, y: bY - cSH, c: "#fbbf24", gc: "#b45309" },
        { x: rx, y: bY - sSH, c: "#60a5fa", gc: "#1d4ed8" }]).forEach(({ x, y, c, gc }) => {
        ctx.save();
        ctx.shadowColor = gc; ctx.shadowBlur = 9; ctx.globalAlpha = 0.97;
        const og = ctx.createRadialGradient(x - orbR * 0.35, y - orbR * 0.38, orbR * 0.08, x, y, orbR);
        og.addColorStop(0, "rgba(255,255,255,0.75)");
        og.addColorStop(0.35, c); og.addColorStop(1, gc);
        ctx.fillStyle = og; ctx.beginPath(); ctx.arc(x, y, orbR, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = gc; ctx.lineWidth = 0.8; ctx.stroke(); ctx.restore();
      });

      ctx.save(); ctx.shadowColor = "#ff4444"; ctx.shadowBlur = 7; ctx.globalAlpha = 0.92;
      ctx.fillStyle = "#f87171"; const gx = cx, gy = bY + bH * 0.5;
      ctx.beginPath(); ctx.moveTo(gx, gy - 4); ctx.lineTo(gx + 3, gy); ctx.lineTo(gx, gy + 4); ctx.lineTo(gx - 3, gy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(gx - 0.8, gy - 1.3, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    },
    avatar_bloodrain: (ctx, W, H, t) => {
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) * 0.38;
      const segments = 80;
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;
        const cycle = (i / segments + t * 0.004) % 1;
        const hue = cycle < 0.5 ? cycle * 2 * 20 : 20 - (cycle - 0.5) * 2 * 20;
        const sat = 88 + Math.sin(cycle * Math.PI * 2 + t * 0.03) * 6;
        const light = 22 + Math.sin((i / segments) * Math.PI * 4 + t * 0.05) * 8;
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
      ctx.save();
      ctx.strokeStyle = "rgba(180,20,20,0.5)";
      ctx.lineWidth = 5; ctx.shadowColor = "#b01414"; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = "rgba(220,80,20,0.25)";
      ctx.lineWidth = 3; ctx.shadowColor = "#dc5014"; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(cx, cy, R - 5, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      const dropCount = 10;
      for (let i = 0; i < dropCount; i++) {
        const spawnAngle = (i / dropCount) * Math.PI * 2;
        if (Math.sin(spawnAngle) < -0.15) continue;
        const sx = cx + Math.cos(spawnAngle) * R;
        const sy = cy + Math.sin(spawnAngle) * R;
        const prog = ((t * 0.7 + i * 9.3) % 100) / 100;
        const maxDrop = Math.min(W, H) * 0.38;
        const dy = prog * maxDrop;
        const op = Math.max(0, Math.min(1, (1 - prog) * 2.5));
        const thick = 2.5 * (1 - prog * 0.5);
        const dropLen = 5 + Math.sin(i * 1.9) * 2;
        const dHue = i % 3 === 0 ? 15 : i % 3 === 1 ? 5 : 0;
        ctx.save();
        ctx.globalAlpha = op;
        ctx.shadowColor = "#8b0000"; ctx.shadowBlur = 5;
        ctx.strokeStyle = "hsl(" + dHue + ",85%,28%)";
        ctx.lineWidth = thick; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(sx, sy + dy); ctx.lineTo(sx, sy + dy + dropLen); ctx.stroke();
        ctx.fillStyle = "hsl(" + dHue + ",80%,22%)";
        ctx.beginPath(); ctx.ellipse(sx, sy + dy + dropLen, thick * 0.9, thick * 1.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    },
    avatar_darkeyes: (ctx, W, H, t) => {
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) * 0.32;

      ctx.save();
      ctx.strokeStyle = "rgba(124,58,237,0.5)";
      ctx.lineWidth = 1.2;
      ctx.shadowColor = "#7c3aed"; ctx.shadowBlur = 8;
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();

      function drawEye(ex: number, ey: number, angle: number, blinkP: number, sc: number) {
        const ew = W * 0.1 * sc, eh = ew * 0.42;
        const bSY = 1 - blinkP * 0.96;
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(angle + Math.PI / 2); ctx.scale(1, bSY);
        const g = ctx.createRadialGradient(0, 0, ew * 0.2, 0, 0, ew * 1.2);
        g.addColorStop(0, "rgba(124,58,237,0.3)"); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, ew * 1.2, eh * 1.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.shadowColor = "#7c3aed"; ctx.shadowBlur = 10; ctx.fillStyle = "#6d28d9";
        ctx.beginPath(); ctx.moveTo(-ew, 0); ctx.bezierCurveTo(-ew, -eh * 1.5, ew, -eh * 1.5, ew, 0); ctx.bezierCurveTo(ew, eh * 1.5, -ew, eh * 1.5, -ew, 0); ctx.fill(); ctx.restore();
        ctx.save(); ctx.fillStyle = "#0a0010";
        const ph = eh * 0.82, pw = ew * 0.13;
        ctx.beginPath(); ctx.moveTo(0, -ph); ctx.bezierCurveTo(pw, -ph * 0.4, pw, ph * 0.4, 0, ph); ctx.bezierCurveTo(-pw, ph * 0.4, -pw, -ph * 0.4, 0, -ph); ctx.fill(); ctx.restore();
        ctx.save(); ctx.strokeStyle = "rgba(109,40,217,0.8)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-ew, 0); ctx.bezierCurveTo(-ew, -eh * 1.5, ew, -eh * 1.5, ew, 0); ctx.bezierCurveTo(ew, eh * 1.5, -ew, eh * 1.5, -ew, 0); ctx.stroke(); ctx.restore();
        ctx.restore();
      }

      const a1 = t * 0.005, a2 = a1 + Math.PI;
      const b1 = Math.max(0, Math.sin(t * 0.07) > 0.96 ? (Math.sin(t * 0.07) - 0.96) / 0.04 : 0);
      const b2 = Math.max(0, Math.sin(t * 0.07 + Math.PI) > 0.96 ? (Math.sin(t * 0.07 + Math.PI) - 0.96) / 0.04 : 0);
      drawEye(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R, a1, b1, 1);
      drawEye(cx + Math.cos(a2) * R, cy + Math.sin(a2) * R, a2, b2, 0.85);
    },
    bg_fallingleaves: (() => {
      const N = 14;
      const seeds = Array.from({ length: N }, (_, i) => ({
        xBase: Math.random(), phase: Math.random() * 100, speed: 0.22 + Math.random() * 0.28,
        swayAmp: 10 + Math.random() * 14, swayFreq: 0.02 + Math.random() * 0.02,
        rotSpeed: (Math.random() < 0.5 ? 1 : -1) * (0.025 + Math.random() * 0.04),
        sz: 3 + Math.random() * 3.5, ci: i % 5, so: Math.random() * Math.PI * 2,
      }));
      const colors = ["#84cc16", "#65a30d", "#a3e635", "#fbbf24", "#86efac"];
      function leaf(ctx: CanvasRenderingContext2D, sz: number, col: string) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(0, -sz);
        ctx.bezierCurveTo(sz * 0.9, -sz * 0.3, sz * 0.9, sz * 0.6, 0, sz);
        ctx.bezierCurveTo(-sz * 0.9, sz * 0.6, -sz * 0.9, -sz * 0.3, 0, -sz);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(0, -sz * 0.8); ctx.lineTo(0, sz * 0.8); ctx.stroke();
      }
      function branch(ctx: CanvasRenderingContext2D, W: number, H: number) {
        ctx.save(); ctx.translate(W, 0);
        ctx.strokeStyle = "rgba(101,163,13,0.5)"; ctx.lineWidth = 2; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-W * 0.09, H * 0.06, -W * 0.17, H * 0.13, -W * 0.28, H * 0.18);
        ctx.stroke();
        ([[0.3, -0.55, W * 0.06, 1.6], [0.55, -0.9, W * 0.07, 1.4], [0.78, -0.45, W * 0.045, 1.2]] as number[][]).forEach(([t, ang, len, lw]) => {
          const mt = 1 - t;
          const px = mt * mt * mt * 0 + 3 * mt * mt * t * (-W * 0.09) + 3 * mt * t * t * (-W * 0.17) + t * t * t * (-W * 0.28);
          const py = mt * mt * mt * 0 + 3 * mt * mt * t * (H * 0.06) + 3 * mt * t * t * (H * 0.13) + t * t * t * (H * 0.18);
          ctx.lineWidth = lw;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang + 1.2) * len); ctx.stroke();
          ctx.save();
          ctx.translate(px + Math.cos(ang) * len * 0.9, py + Math.sin(ang + 1.2) * len * 0.9);
          ctx.rotate(ang - Math.PI / 2);
          ctx.globalAlpha = 0.65;
          leaf(ctx, lw * 2.8, "#84cc16");
          ctx.restore();
        });
        ctx.restore();
      }
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        ctx.clearRect(0, 0, W, H);
        const wash = ctx.createLinearGradient(0, 0, 0, H);
        wash.addColorStop(0, "rgba(132,204,22,0.10)"); wash.addColorStop(1, "rgba(101,163,13,0.03)");
        ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);
        branch(ctx, W, H);
        for (let i = 0; i < N; i++) {
          const s = seeds[i];
          const prog = ((t * s.speed + s.phase) % 100) / 100;
          const y = prog * (H + 30) - 15;
          const x = (s.xBase * W + Math.sin(t * s.swayFreq + s.so) * s.swayAmp + W) % W;
          const fi = Math.min(1, prog * 12), fo = Math.min(1, (1 - prog) * 8);
          ctx.save();
          ctx.globalAlpha = 0.7 * fi * fo;
          ctx.translate(x, y);
          ctx.rotate(t * s.rotSpeed + s.phase);
          leaf(ctx, s.sz, colors[s.ci]);
          ctx.restore();
        }
      };
    })(),
    bg_underwater: (() => {
      const BC = 10;
      type Bubble = { x: number; wo: number; sp: number; r: number; ph: number; pa: number; pop: boolean; pt: number; px: number; py: number };
      let bb: Bubble[] | null = null;
      function init(W: number): Bubble[] {
        return Array.from({ length: BC }, () => ({
          x: Math.random() * W, wo: Math.random() * Math.PI * 2, sp: 0.3 + Math.random() * 0.5,
          r: 1.5 + Math.random() * 3.5, ph: Math.random() * 100, pa: 0.08 + Math.random() * 0.22,
          pop: false, pt: 0, px: 0, py: 0,
        }));
      }
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        ctx.clearRect(0, 0, W, H);
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "rgba(14,165,233,0.30)"); g.addColorStop(1, "rgba(7,89,133,0.10)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        if (!bb) bb = init(W);
        for (let i = 0; i < bb.length; i++) {
          const b = bb[i];
          const prog = ((t * b.sp + b.ph) % 100) / 100;
          const ry = H * (1 - prog);
          const bx = (b.x + Math.sin(prog * Math.PI * 3 + b.wo) * 16 + W) % W;
          if (!b.pop && prog >= 1 - b.pa) { b.pop = true; b.pt = 0; b.px = bx; b.py = ry; }
          if (b.pop) {
            b.pt++;
            const pt = b.pt / 16;
            if (pt <= 1) {
              const pr = b.r * (1 + pt * 3);
              ctx.save(); ctx.globalAlpha = (1 - pt) * 0.5; ctx.strokeStyle = "#bae6fd"; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.arc(b.px, b.py, pr, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
              for (let d = 0; d < 4; d++) {
                const da = b.wo + d * Math.PI / 2;
                const dx = b.px + Math.cos(da) * pr * 0.9;
                const dy = b.py + Math.sin(da) * pr * 0.9;
                ctx.save(); ctx.globalAlpha = (1 - pt) * 0.45; ctx.fillStyle = "#7dd3fc";
                ctx.beginPath(); ctx.arc(dx, dy, Math.max(0.4, b.r * 0.2 * (1 - pt)), 0, Math.PI * 2); ctx.fill(); ctx.restore();
              }
            } else {
              b.x = Math.random() * W; b.wo = Math.random() * Math.PI * 2; b.sp = 0.3 + Math.random() * 0.5;
              b.r = 1.5 + Math.random() * 3.5; b.ph = Math.random() * 100; b.pa = 0.08 + Math.random() * 0.22; b.pop = false; b.pt = 0;
            }
          } else {
            const al = prog < 0.08 ? prog / 0.08 : prog > 0.88 ? (1 - prog) / 0.12 : 1;
            ctx.save(); ctx.globalAlpha = al * 0.6; ctx.strokeStyle = "#7dd3fc"; ctx.lineWidth = 1; ctx.shadowColor = "#38bdf8"; ctx.shadowBlur = 5;
            ctx.beginPath(); ctx.arc(bx, ry, b.r, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = al * 0.16; ctx.fillStyle = "#e0f2fe";
            ctx.beginPath(); ctx.arc(bx - b.r * 0.28, ry - b.r * 0.28, b.r * 0.36, 0, Math.PI * 2); ctx.fill(); ctx.restore();
          }
        }
      };
    })(),
    bg_gas: (ctx, W, H, t) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(76,29,149,0.12)"; ctx.fillRect(0, 0, W, H);
      const colors = ["#a78bfa", "#c084fc", "#8b5cf6"];
      for (let i = 0; i < 7; i++) {
        const x = W / 2 + Math.cos(t * 0.014 + i * 51 * Math.PI / 180) * W * 0.34;
        const y = H / 2 + Math.sin(t * 0.017 + i * 51 * Math.PI / 180) * H * 0.36;
        const r = 26 + Math.sin(t * 0.02 + i) * 10;
        ctx.save(); ctx.globalAlpha = 0.32;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, colors[i % colors.length]); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    },
    bg_fireworks: (() => {
      type Spark = { x: number; y: number; vx: number; vy: number; life: number; trail: { x: number; y: number }[] };
      const bursts: { particles: Spark[]; color: string; life: number; maxLife: number }[] = [];
      const COLORS = ["#ffd700", "#f97316", "#ef4444", "#a78bfa", "#34d399", "#60a5fa", "#f472b6"];
      let lastBurst = 0;
      function spawnBurst(W: number, H: number) {
        const x = W * (0.15 + Math.random() * 0.7);
        const y = H * (0.1 + Math.random() * 0.6);
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const count = 18 + Math.floor(Math.random() * 10);
        const speed = 1.5 + Math.random() * 1.8;
        const particles: Spark[] = [];
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
          const s = speed * (0.5 + Math.random() * 0.8);
          particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.8, life: 1, trail: [] });
        }
        bursts.push({ particles, color, life: 1, maxLife: 55 + Math.floor(Math.random() * 20) });
      }
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "rgba(15,10,35,0.55)"; ctx.fillRect(0, 0, W, H);
        if (t - lastBurst > 70 || bursts.length === 0) {
          if (bursts.length < 4) { spawnBurst(W, H); lastBurst = t; }
        }
        if (bursts.length < 2 && t - lastBurst > 35) { spawnBurst(W, H); }
        for (let b = bursts.length - 1; b >= 0; b--) {
          const burst = bursts[b];
          burst.life -= 1 / burst.maxLife;
          if (burst.life <= 0) { bursts.splice(b, 1); continue; }
          for (const p of burst.particles) {
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 4) p.trail.shift();
            p.x += p.vx; p.y += p.vy;
            p.vx *= 0.97; p.vy = p.vy * 0.97 + 0.1;
            p.life = burst.life;
          }
          for (const p of burst.particles) {
            if (p.trail.length > 1) {
              ctx.save();
              ctx.strokeStyle = burst.color; ctx.lineWidth = 1; ctx.globalAlpha = p.life * 0.3;
              ctx.beginPath(); ctx.moveTo(p.trail[0].x, p.trail[0].y);
              for (const pt of p.trail) ctx.lineTo(pt.x, pt.y);
              ctx.stroke(); ctx.restore();
            }
            const sz = Math.max(0.4, 2.5 * p.life);
            ctx.save();
            ctx.globalAlpha = p.life * 0.9; ctx.fillStyle = burst.color;
            ctx.shadowColor = burst.color; ctx.shadowBlur = 7;
            ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
          }
        }
      };
    })(),
    bg_hell: (() => {
      let hellSeeds: { xBase: number; xWobble: number; speed: number; phase: number; sz0: number }[] | null = null;
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        ctx.clearRect(0, 0, W, H);
        const g = ctx.createLinearGradient(0, H, 0, 0);
        g.addColorStop(0, "rgba(239,68,68,0.25)"); g.addColorStop(0.4, "rgba(120,20,20,0.12)"); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        const penta = (cx: number, cy: number, r: number, rot: number, alpha: number, clr: string) => {
          ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = clr; ctx.lineWidth = 1;
          ctx.shadowColor = clr; ctx.shadowBlur = 8; ctx.beginPath();
          for (let p = 0; p < 5; p++) {
            const a = rot + p * 4 * Math.PI / 5 - Math.PI / 2;
            const x = cx + r * Math.cos(a); const y = cy + r * Math.sin(a);
            if (p === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath(); ctx.stroke(); ctx.restore();
        };
        const soul = (cx: number, cy: number, sz: number, alpha: number, clr: string) => {
          ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = clr; ctx.shadowColor = clr; ctx.shadowBlur = 16;
          ctx.beginPath(); ctx.arc(cx, cy, sz, Math.PI, 0, false);
          ctx.lineTo(cx + sz, cy + sz * 1.8);
          ctx.quadraticCurveTo(cx + sz * 0.5, cy + sz * 1.3, cx, cy + sz * 1.6);
          ctx.quadraticCurveTo(cx - sz * 0.5, cy + sz * 1.3, cx - sz, cy + sz * 1.8);
          ctx.lineTo(cx - sz, cy); ctx.closePath(); ctx.fill(); ctx.restore();
        };
        for (let i = 0; i < 6; i++) {
          const sd = i * 137.5;
          const px = (Math.sin(sd) * 0.45 + 0.5) * W;
          const py = (Math.cos(sd * 0.7) * 0.28 + 0.32) * H * 0.65;
          const pr = 5 + Math.sin(sd * 0.3) * 3;
          const rot = t * 0.004 * (i % 2 ? 1 : -1) + sd;
          const a = 0.22 + Math.sin(t * 0.006 + sd) * 0.1;
          penta(px, py, pr, rot, a, "#ef4444");
        }
        if (!hellSeeds) { hellSeeds = Array.from({ length: 8 }, () => ({ xBase: Math.random(), xWobble: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 0.5, phase: Math.random() * 100, sz0: 2 + Math.random() * 2 })); }
        for (let i = 0; i < 8; i++) {
          const s = hellSeeds[i];
          const prog = ((t * s.speed + s.phase) % 100) / 100;
          const x = (s.xBase * W * 0.88 + W * 0.06 + Math.sin(prog * Math.PI * 3 + s.xWobble) * 14) % W;
          const y = H * (1 - prog * 0.92) + 8;
          const sz = s.sz0 + prog * 3;
          const a = prog < 0.1 ? prog * 10 : prog > 0.85 ? (1 - prog) / 0.15 : 0.7;
          const clr = prog > 0.5 ? "rgba(255,180,180,0.9)" : "rgba(255,100,100,0.85)";
          soul(x, y, sz, a, clr);
        }
      };
    })(),
    bg_shadowworld: (ctx, W, H, t) => {
      ctx.clearRect(0, 0, W, H);
      const wash = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.65);
      wash.addColorStop(0, "rgba(88,28,135,0.32)"); wash.addColorStop(1, "rgba(10,5,20,0.5)");
      ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 6; i++) {
        const x = W * 0.1 + i * (W * 0.16) + Math.sin(t * 0.02 + i) * 10;
        const y = H / 2 + Math.cos(t * 0.024 + i * 1.3) * H * 0.3;
        const r = 8 + Math.sin(t * 0.03 + i) * 4;
        ctx.save(); ctx.globalAlpha = 0.75; ctx.fillStyle = "#a855f7"; ctx.shadowColor = "#c084fc"; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      const blink = Math.max(0, Math.sin(t * 0.04));
      if (blink > 0.15) {
        ctx.save(); ctx.globalAlpha = blink; ctx.fillStyle = "#f472b6"; ctx.shadowColor = "#ec4899"; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.4, W * 0.05, W * 0.02, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(W * 0.5, H * 0.4, 1.5, 0, Math.PI * 2); ctx.fillStyle = "#1a0a2e"; ctx.fill();
        ctx.restore();
      }
    },
    bg_rain: (ctx, W, H, t) => {
      ctx.clearRect(0, 0, W, H);
      const wash = ctx.createLinearGradient(0, 0, 0, H);
      wash.addColorStop(0, "rgba(30,58,138,0.28)"); wash.addColorStop(1, "rgba(15,23,42,0.4)");
      ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) {
        const speed = 4 + (i % 5) * 1.3;
        const y = ((t * speed + i * 37) % (H + 20)) - 10;
        const x = (i * 53 + Math.sin(i) * 30 + W) % W;
        ctx.save(); ctx.strokeStyle = "#93c5fd"; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.3;
        ctx.shadowColor = "#60a5fa"; ctx.shadowBlur = 3;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 12); ctx.stroke(); ctx.restore();
      }
    },
    bg_sakura: (() => {
      const N = 14;
      const seeds = Array.from({ length: N }, () => ({
        xBase: Math.random(), phase: Math.random() * 100, speed: 0.2 + Math.random() * 0.3,
        swayAmp: 12 + Math.random() * 16, swayFreq: 0.02 + Math.random() * 0.02, so: Math.random() * Math.PI * 2,
        sz: 3 + Math.random() * 2.5, rot: Math.random() * (Math.PI < 1 ? 1 : 1),
      }));
      function petal(ctx: CanvasRenderingContext2D, sz: number) {
        ctx.beginPath();
        ctx.moveTo(0, -sz);
        ctx.quadraticCurveTo(sz * 0.8, -sz * 0.3, 0, sz);
        ctx.quadraticCurveTo(-sz * 0.8, -sz * 0.3, 0, -sz);
        ctx.fill();
      }
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        ctx.clearRect(0, 0, W, H);
        const wash = ctx.createLinearGradient(0, 0, 0, H);
        wash.addColorStop(0, "rgba(249,168,212,0.16)"); wash.addColorStop(1, "rgba(219,39,119,0.06)");
        ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < N; i++) {
          const s = seeds[i];
          const prog = ((t * s.speed + s.phase) % 100) / 100;
          const y = prog * (H + 20) - 10;
          const x = (s.xBase * W + Math.sin(t * s.swayFreq + s.so) * s.swayAmp + W) % W;
          ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = i % 2 ? "#f9a8d4" : "#fbcfe8";
          ctx.translate(x, y); ctx.rotate(t * 0.03 + s.so);
          petal(ctx, s.sz); ctx.restore();
        }
      };
    })(),
    bg_digitalgrid: (ctx, W, H, t) => {
      ctx.clearRect(0, 0, W, H);
      const wash = ctx.createLinearGradient(0, 0, 0, H);
      wash.addColorStop(0, "rgba(6,182,212,0.05)"); wash.addColorStop(1, "rgba(0,212,255,0.22)");
      ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);
      const horizon = H * 0.42;
      ctx.save(); ctx.strokeStyle = "#00d4ff"; ctx.shadowColor = "#00d4ff"; ctx.shadowBlur = 5;
      for (let i = -6; i <= 6; i++) {
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(W / 2 + i * 14, horizon); ctx.lineTo(W / 2 + i * W * 0.5, H); ctx.stroke();
      }
      const n = 6;
      for (let i = 0; i < n; i++) {
        const prog = ((t * 0.02 + i / n) % 1);
        const y = horizon + prog * prog * (H - horizon);
        ctx.globalAlpha = 0.55 * (1 - prog * 0.4);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.globalAlpha = 0.8; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(W, horizon); ctx.stroke();
      ctx.restore();
    },
    bg_aurora: (() => {
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "rgba(6,10,20,0.5)"; ctx.fillRect(0, 0, W, H);
        const bands = [
          { c: "rgba(52,211,153,0.5)", yb: 0.35, amp: 16, sp: 0.018 },
          { c: "rgba(129,140,248,0.4)", yb: 0.48, amp: 20, sp: 0.014 },
          { c: "rgba(236,72,153,0.32)", yb: 0.58, amp: 14, sp: 0.02 },
        ];
        for (const b of bands) {
          ctx.save();
          ctx.beginPath(); ctx.moveTo(0, H);
          for (let x = 0; x <= W; x += W / 30) {
            const y = H * b.yb + Math.sin(x * 0.025 + t * b.sp) * b.amp + Math.sin(x * 0.008 - t * b.sp * 1.5) * b.amp * 0.6;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(W, H); ctx.closePath();
          const g = ctx.createLinearGradient(0, H * b.yb - b.amp, 0, H);
          g.addColorStop(0, b.c); g.addColorStop(1, "transparent");
          ctx.fillStyle = g; ctx.globalAlpha = 0.9; ctx.fill(); ctx.restore();
        }
      };
    })(),
    bg_tvglitch: (ctx, W, H, t) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(20,4,8,0.6)"; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < H; i += 2) {
        ctx.fillStyle = i % 4 === 0 ? "rgba(255,26,60,0.05)" : "rgba(255,255,255,0.02)";
        ctx.fillRect(0, i, W, 1);
      }
      if (Math.sin(t * 0.15) > 0.5) {
        for (let b = 0; b < 3; b++) {
          const y = Math.random() * H;
          const h = 3 + Math.random() * 8;
          const shift = (Math.random() - 0.5) * 16;
          ctx.save(); ctx.globalAlpha = 0.5;
          ctx.fillStyle = "#ff1a3c"; ctx.fillRect(shift, y, W, h);
          ctx.globalCompositeOperation = "lighten";
          ctx.fillStyle = "#00e5ff"; ctx.fillRect(-shift, y, W, h);
          ctx.restore();
        }
      }
      ctx.save(); ctx.globalAlpha = 0.7; ctx.strokeStyle = "#ff1a3c"; ctx.lineWidth = 1.5; ctx.shadowColor = "#ff1a3c"; ctx.shadowBlur = 6;
      ctx.strokeRect(2, 2, W - 4, H - 4); ctx.restore();
    },
    bg_matrix: (() => {
      let cols: { y: number; sp: number; len: number }[] = [];
      let initedFor = 0;
      const chars = "01アイウエオカキクケコ";
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        if (initedFor !== W) {
          const n = Math.floor(W / 12);
          cols = Array.from({ length: n }, () => ({ y: Math.random() * -50, sp: 1.5 + Math.random() * 2, len: 4 + Math.floor(Math.random() * 5) }));
          initedFor = W;
        }
        ctx.fillStyle = "rgba(2,10,2,0.35)"; ctx.fillRect(0, 0, W, H);
        ctx.font = "11px monospace"; ctx.textAlign = "center";
        cols.forEach((c, i) => {
          c.y += c.sp;
          if (c.y - c.len * 14 > H) { c.y = -20; c.sp = 1.5 + Math.random() * 2; }
          const x = i * 12 + 6;
          for (let j = 0; j < c.len; j++) {
            const y = c.y - j * 14;
            if (y < 0 || y > H) continue;
            const ch = chars[Math.floor((t * 0.3 + i * 7 + j) % chars.length)];
            ctx.globalAlpha = j === 0 ? 1 : Math.max(0, 0.75 - j * 0.14);
            ctx.fillStyle = j === 0 ? "#d1ffd1" : "#39ff14";
            if (j === 0) { ctx.shadowColor = "#39ff14"; ctx.shadowBlur = 8; } else { ctx.shadowBlur = 0; }
            ctx.fillText(ch, x, y);
          }
        });
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      };
    })(),
    bg_lightning: (() => {
      let bolts: { x: number; y: number }[][] = [];
      let lastFlash = -100;
      function makeBolt(W: number, H: number) {
        const pts = [{ x: W * (0.2 + Math.random() * 0.6), y: 0 }];
        let x = pts[0].x, y = 0;
        while (y < H * 0.85) {
          x += (Math.random() - 0.5) * W * 0.16;
          y += H * (0.12 + Math.random() * 0.1);
          pts.push({ x, y });
        }
        return pts;
      }
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "rgba(15,20,35,0.55)"; ctx.fillRect(0, 0, W, H);
        if (t - lastFlash > 55) { lastFlash = t; bolts = [makeBolt(W, H)]; if (Math.random() > 0.5) bolts.push(makeBolt(W, H)); }
        const age = t - lastFlash;
        const flash = Math.max(0, 1 - age / 14);
        if (flash > 0) {
          ctx.save(); ctx.globalAlpha = flash * 0.18; ctx.fillStyle = "#fef9c3"; ctx.fillRect(0, 0, W, H); ctx.restore();
          for (const pts of bolts) {
            ctx.save(); ctx.strokeStyle = "#fef9c3"; ctx.shadowColor = "#facc15"; ctx.shadowBlur = 12;
            ctx.lineWidth = 2; ctx.globalAlpha = flash;
            ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
            for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
            ctx.stroke(); ctx.restore();
          }
        }
      };
    })(),
    bg_galaxy: (() => {
      let stars: { x: number; y: number; r: number; tw: number }[] = [];
      let initedFor = 0;
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        if (initedFor !== W * 10000 + H) {
          stars = Array.from({ length: 50 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + 0.4, tw: Math.random() * Math.PI * 2 }));
          initedFor = W * 10000 + H;
        }
        ctx.clearRect(0, 0, W, H);
        const cx = W * 0.6, cy = H * 0.4;
        const neb = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.55);
        neb.addColorStop(0, "rgba(192,132,252,0.4)"); neb.addColorStop(0.5, "rgba(129,102,241,0.22)"); neb.addColorStop(1, "rgba(10,5,20,0.3)");
        ctx.fillStyle = neb; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        for (const s of stars) {
          ctx.globalAlpha = Math.max(0, 0.5 + Math.sin(t * 0.04 + s.tw) * 0.5);
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      };
    })(),
    bg_neoncity: (() => {
      let bld: { x: number; w: number; h: number; hue: number; ph: number }[] = []; let initedFor = 0;
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        if (initedFor !== W) {
          const n = 10;
          bld = Array.from({ length: n }, (_, i) => ({ x: (i * W) / n, w: (W / n) * 0.7, h: H * (0.3 + Math.random() * 0.55), hue: [300, 190, 320, 175][i % 4], ph: Math.random() * 10 }));
          initedFor = W;
        }
        ctx.clearRect(0, 0, W, H);
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "rgba(24,6,40,0.6)"); sky.addColorStop(1, "rgba(60,10,60,0.2)");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        for (const b of bld) {
          const y = H - b.h;
          ctx.fillStyle = "rgba(6,3,12,0.9)"; ctx.fillRect(b.x, y, b.w, b.h);
          const glow = 0.6 + Math.sin(t * 0.05 + b.ph) * 0.35;
          ctx.save(); ctx.strokeStyle = `hsla(${b.hue},90%,60%,${glow})`; ctx.shadowColor = `hsl(${b.hue},90%,55%)`; ctx.shadowBlur = 8; ctx.lineWidth = 1.4;
          ctx.strokeRect(b.x + 1, y + 1, b.w - 2, b.h - 2); ctx.restore();
        }
      };
    })(),
    bg_bioluminescent: (ctx, W, H, t) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(4,20,25,0.4)"; ctx.fillRect(0, 0, W, H);
      for (let layer = 0; layer < 2; layer++) {
        const baseY = H * (0.55 + layer * 0.2);
        ctx.save(); ctx.globalAlpha = 0.35 - layer * 0.1;
        ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += W / 24) ctx.lineTo(x, baseY + Math.sin(x * 0.03 + t * 0.02 + layer) * (8 + layer * 5));
        ctx.lineTo(W, H); ctx.closePath();
        const g = ctx.createLinearGradient(0, baseY, 0, H);
        g.addColorStop(0, "rgba(45,212,191,0.65)"); g.addColorStop(1, "rgba(8,145,178,0.05)");
        ctx.fillStyle = g; ctx.fill(); ctx.restore();
      }
      for (let i = 0; i < 16; i++) {
        const x = ((i * 53 + t * 0.6) % (W + 20)) - 10;
        const y = H * 0.6 + Math.sin(t * 0.03 + i) * H * 0.25;
        ctx.save(); ctx.globalAlpha = 0.5 + Math.sin(t * 0.08 + i) * 0.4;
        ctx.fillStyle = "#5eead4"; ctx.shadowColor = "#2dd4bf"; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    },
    bg_meteors: (() => {
      let stars: { x: number; y: number; r: number; tw: number }[] = []; let initedFor = 0;
      let meteors: { x: number; y: number; vx: number; vy: number; life: number }[] = []; let lastSpawn = 0;
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        if (initedFor !== W * 10000 + H) { stars = Array.from({ length: 45 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + 0.3, tw: Math.random() * Math.PI * 2 })); initedFor = W * 10000 + H; meteors = []; }
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "rgba(6,10,25,0.4)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        for (const s of stars) { ctx.globalAlpha = Math.max(0, 0.4 + Math.sin(t * 0.04 + s.tw) * 0.4); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
        if (t - lastSpawn > 30 && meteors.length < 3) { lastSpawn = t; meteors.push({ x: Math.random() * W * 0.5, y: -6, vx: 3.6 + Math.random(), vy: 2.4 + Math.random(), life: 1 }); }
        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i]; m.x += m.vx; m.y += m.vy; m.life -= 0.02;
          if (m.life <= 0 || m.x > W + 10 || m.y > H + 10) { meteors.splice(i, 1); continue; }
          ctx.save();
          const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 7, m.y - m.vy * 7);
          grad.addColorStop(0, `rgba(147,197,253,${m.life})`); grad.addColorStop(1, "transparent");
          ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.shadowColor = "#93c5fd"; ctx.shadowBlur = 7;
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * 7, m.y - m.vy * 7); ctx.stroke();
          ctx.fillStyle = `rgba(255,255,255,${m.life})`; ctx.beginPath(); ctx.arc(m.x, m.y, 1.4, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      };
    })(),
  };
}

let sharedRenderers: Record<string, Renderer> | null = null;

export default function EffectPreviewCanvas({ effectId }: { effectId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const el = canvas?.parentElement;
    if (!canvas || !el) return;
    if (!sharedRenderers) sharedRenderers = buildRenderers();
    const renderer = sharedRenderers[effectId];
    if (!renderer) return;

    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 0;
    function resize() {
      const r = el!.getBoundingClientRect();
      W = canvas!.width = r.width || 205;
      H = canvas!.height = r.height || 98;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let frame = 0;
    let raf = 0;
    let stopped = false;
    const loop = () => {
      if (stopped) return;
      renderer(ctx, W, H, frame++);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [effectId]);

  return <canvas ref={canvasRef} />;
}
