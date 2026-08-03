"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number; y: number; size: number; op: number; opDir: number; opSpd: number; spd: number;
}
interface Shot {
  x: number; y: number; vx: number; vy: number; angle: number; len: number; life: number;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const opts = { count: 130, speed: 0.25, sizeMin: 0.4, sizeMax: 2.2, opMin: 0.1, opMax: 0.75, shootInterval: 3500 };
    const r = (a: number, b: number) => Math.random() * (b - a) + a;
    const mkStar = (rand = false): Star => ({
      x: r(0, canvas.width),
      y: rand ? r(0, canvas.height) : -3,
      size: r(opts.sizeMin, opts.sizeMax),
      op: r(opts.opMin, opts.opMax),
      opDir: Math.random() < 0.5 ? 1 : -1,
      opSpd: r(0.002, 0.006),
      spd: r(0.04, opts.speed),
    });
    const mkShot = (): Shot => {
      const angle = (r(25, 55) * Math.PI) / 180;
      return {
        x: r(0, canvas.width * 0.7),
        y: r(0, canvas.height * 0.4),
        vx: Math.cos(angle) * r(8, 14),
        vy: Math.sin(angle) * r(8, 14),
        angle,
        len: r(80, 200),
        life: 1,
      };
    };

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const stars: Star[] = Array.from({ length: opts.count }, () => mkStar(true));
    const shots: Shot[] = [];
    let lastShot = 0;
    let raf = 0;

    function loop() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.op += s.opSpd * s.opDir;
        if (s.op >= opts.opMax || s.op <= opts.opMin) s.opDir *= -1;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, s.op));
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        s.y += s.spd;
        if (s.y > canvas.height + 4) stars[i] = mkStar(false);
      }

      const now = Date.now();
      if (now - lastShot > opts.shootInterval) {
        shots.push(mkShot());
        lastShot = now;
      }
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.016;
        if (s.life <= 0) {
          shots.splice(i, 1);
          continue;
        }
        const tx = s.x - Math.cos(s.angle) * s.len * s.life;
        const ty = s.y - Math.sin(s.angle) * s.len * s.life;
        const g = ctx.createLinearGradient(tx, ty, s.x, s.y);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(1, `rgba(255,255,255,${s.life * 0.8})`);
        ctx.save();
        ctx.globalAlpha = s.life;
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
        ctx.restore();
      }

      raf = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} id="particle-canvas" />;
}
