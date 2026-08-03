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
        ctx.save(); ctx.globalAlpha = op; ctx.strokeStyle = "#00d4ff"; ctx.lineWidth = 1.5;
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
      let bb: any = null;
      function init(W: number) {
        bb = Array.from({ length: BC }, () => ({
          x: Math.random() * W, wo: Math.random() * Math.PI * 2, sp: 0.3 + Math.random() * 0.5,
          r: 1.5 + Math.random() * 3.5, ph: Math.random() * 100, pa: 0.08 + Math.random() * 0.22,
          pop: false, pt: 0, px: 0, py: 0,
        }));
      }
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        ctx.clearRect(0, 0, W, H);
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "rgba(3,105,161,0.18)"); g.addColorStop(1, "rgba(7,89,133,0.05)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        if (!bb) init(W);
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
      for (let i = 0; i < 6; i++) {
        const x = W / 2 + Math.cos(t * 0.012 + i * 60 * Math.PI / 180) * W * 0.28;
        const y = H / 2 + Math.sin(t * 0.015 + i * 60 * Math.PI / 180) * H * 0.3;
        const r = 22 + Math.sin(t * 0.02 + i) * 8;
        ctx.save(); ctx.globalAlpha = 0.08;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "#a78bfa"); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    },
    bg_fireworks: (() => {
      const bursts: any[] = [];
      const COLORS = ["#ffd700", "#f97316", "#ef4444", "#a78bfa", "#34d399", "#60a5fa", "#f472b6"];
      let lastBurst = 0;
      function spawnBurst(W: number, H: number) {
        const x = W * (0.15 + Math.random() * 0.7);
        const y = H * (0.1 + Math.random() * 0.6);
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const count = 18 + Math.floor(Math.random() * 10);
        const speed = 1.5 + Math.random() * 1.8;
        const particles: any[] = [];
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
          const s = speed * (0.5 + Math.random() * 0.8);
          particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.8, life: 1, trail: [] });
        }
        bursts.push({ particles, color, life: 1, maxLife: 55 + Math.floor(Math.random() * 20) });
      }
      return (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
        ctx.clearRect(0, 0, W, H);
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
      let hellSeeds: any = null;
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
            p === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
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
      for (let i = 0; i < 7; i++) {
        const x = W * 0.05 + i * (W * 0.15) + Math.sin(t * 0.008 + i) * 14;
        const y = H / 2 + Math.cos(t * 0.01 + i) * H * 0.28;
        const r = 10 + Math.sin(t * 0.018 + i) * 6;
        ctx.save(); ctx.globalAlpha = 0.92;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.4);
        g.addColorStop(0, "rgba(109,40,217,0.32)"); g.addColorStop(0.5, "rgba(76,29,149,0.16)"); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      for (let i = 0; i < 5; i++) {
        const x = W * 0.1 + i * (W * 0.2) + Math.cos(t * 0.011 + i * 1.3) * 9;
        const y = H * 0.2 + ((t * 0.15 + i * 14) % 100) / 100 * H * 0.6;
        const r = 4 + Math.sin(t * 0.025 + i) * 2.5;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(139,92,246,0.38)"); g.addColorStop(1, "transparent");
        ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      function drawBgEye(ex: number, ey: number, ew: number, blinkT: number, hue: number) {
        const eh = ew * 0.38;
        const blink = Math.max(0, Math.sin(blinkT));
        if (blink < 0.02) return;
        ctx.save(); ctx.translate(ex, ey); ctx.scale(1, blink);
        const grd = ctx.createRadialGradient(0, 0, ew * 0.1, 0, 0, ew * 1.4);
        grd.addColorStop(0, `hsla(${hue},80%,45%,0.18)`); grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd; ctx.beginPath(); ctx.ellipse(0, 0, ew * 1.4, eh * 1.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.shadowColor = `hsl(${hue},70%,40%)`; ctx.shadowBlur = 8;
        ctx.fillStyle = `hsl(${hue},60%,22%)`;
        ctx.beginPath(); ctx.moveTo(-ew, 0); ctx.bezierCurveTo(-ew, -eh * 1.6, ew, -eh * 1.6, ew, 0);
        ctx.bezierCurveTo(ew, eh * 1.6, -ew, eh * 1.6, -ew, 0); ctx.fill(); ctx.restore();
        ctx.save(); ctx.globalAlpha = 0.27; ctx.fillStyle = `hsl(${hue},70%,55%)`;
        ctx.beginPath(); ctx.moveTo(-ew * 0.45, 0); ctx.bezierCurveTo(-ew * 0.45, -eh, ew * 0.45, -eh, ew * 0.45, 0);
        ctx.bezierCurveTo(ew * 0.45, eh, -ew * 0.45, eh, -ew * 0.45, 0); ctx.fill(); ctx.restore();
        ctx.save(); ctx.fillStyle = "#05000f";
        ctx.beginPath(); ctx.moveTo(0, -eh * 0.88); ctx.bezierCurveTo(ew * 0.12, -eh * 0.3, ew * 0.12, eh * 0.3, 0, eh * 0.88);
        ctx.bezierCurveTo(-ew * 0.12, eh * 0.3, -ew * 0.12, -eh * 0.3, 0, -eh * 0.88); ctx.fill(); ctx.restore();
        ctx.save(); ctx.strokeStyle = `hsla(${hue},70%,55%,0.6)`; ctx.lineWidth = 0.8;
        ctx.shadowColor = `hsl(${hue},70%,50%)`; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(-ew, 0); ctx.bezierCurveTo(-ew, -eh * 1.6, ew, -eh * 1.6, ew, 0);
        ctx.bezierCurveTo(ew, eh * 1.6, -ew, eh * 1.6, -ew, 0); ctx.stroke(); ctx.restore();
        ctx.restore();
      }
      const eyes = [
        { fx: 0.06, fy: 0.22, fs: 0.06, ph: 0, hue: 270 },
        { fx: 0.09, fy: 0.65, fs: 0.05, ph: 55, hue: 278 },
        { fx: 0.94, fy: 0.30, fs: 0.055, ph: 30, hue: 265 },
        { fx: 0.91, fy: 0.72, fs: 0.048, ph: 85, hue: 272 },
      ];
      eyes.forEach(({ fx, fy, fs, ph, hue }) => {
        const blinkT = Math.sin((t + ph) * 0.022) * Math.PI;
        ctx.save(); ctx.globalAlpha = 0.75 + Math.sin(t * 0.015 + ph) * 0.15;
        drawBgEye(fx * W, fy * H, fs * W, blinkT, hue);
        ctx.restore();
      });
      if (Math.sin(t * 0.05) > 0.8) {
        ctx.save(); ctx.globalAlpha = 0.10; ctx.strokeStyle = "#4c1d95"; ctx.lineWidth = 1;
        for (let j = 0; j < 3; j++) {
          const ly = Math.random() * H;
          ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke();
        }
        ctx.restore();
      }
    },
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
