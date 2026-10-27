"use client";

import { useEffect } from "react";

/** "Spore Trail": a glowing comet head with a soft tapering tail, occasionally shedding a drifting spore. */
export default function CursorTrail({ color = "#39ff14" }: { color?: string }) {
  useEffect(() => {
    if ("ontouchstart" in window) return;

    const count = 8;
    const dots: { el: HTMLDivElement; x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const d = document.createElement("div");
      const sz = Math.max(3, 15 - i * 1.4);
      const glow = Math.max(0, 14 - i * 1.6);
      d.style.cssText = `width:${sz}px;height:${sz}px;background:${color};border-radius:50%;position:fixed;pointer-events:none;z-index:9998;opacity:0;mix-blend-mode:screen;will-change:transform;box-shadow:0 0 ${glow}px ${glow * 0.6}px ${color};`;
      document.body.appendChild(d);
      dots.push({ el: d, x: 0, y: 0 });
    }

    const mouse = { x: 0, y: 0 };
    function onMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }
    document.addEventListener("mousemove", onMove);

    // Occasionally shed a small spore that drifts off and fades.
    const spores: { el: HTMLDivElement; vx: number; vy: number; life: number }[] = [];
    let lastSpore = 0;
    function spawnSpore() {
      const d = document.createElement("div");
      const sz = Math.random() * 3 + 2;
      d.style.cssText = `width:${sz}px;height:${sz}px;background:${color};border-radius:50%;position:fixed;pointer-events:none;z-index:9997;opacity:.7;mix-blend-mode:screen;will-change:transform;box-shadow:0 0 6px 2px ${color};left:${mouse.x}px;top:${mouse.y}px;`;
      document.body.appendChild(d);
      spores.push({ el: d, vx: (Math.random() - 0.5) * 0.6, vy: -Math.random() * 0.8 - 0.2, life: 1 });
    }

    let raf = 0;
    function animate() {
      let x = mouse.x;
      let y = mouse.y;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        d.x += (x - d.x) * (0.22 + i * 0.006);
        d.y += (y - d.y) * (0.22 + i * 0.006);
        const op = (1 - i / dots.length) * 0.65;
        d.el.style.opacity = String(op);
        d.el.style.left = d.x - parseFloat(d.el.style.width) / 2 + "px";
        d.el.style.top = d.y - parseFloat(d.el.style.height) / 2 + "px";
        x = d.x;
        y = d.y;
      }

      const now = Date.now();
      if (now - lastSpore > 220 && (mouse.x || mouse.y)) {
        spawnSpore();
        lastSpore = now;
      }
      for (let i = spores.length - 1; i >= 0; i--) {
        const s = spores[i];
        s.life -= 0.02;
        if (s.life <= 0) {
          s.el.remove();
          spores.splice(i, 1);
          continue;
        }
        const left = parseFloat(s.el.style.left);
        const top = parseFloat(s.el.style.top);
        s.el.style.left = left + s.vx + "px";
        s.el.style.top = top + s.vy + "px";
        s.el.style.opacity = String(s.life * 0.7);
      }

      raf = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      dots.forEach((d) => d.el.remove());
      spores.forEach((s) => s.el.remove());
    };
  }, [color]);

  return null;
}
