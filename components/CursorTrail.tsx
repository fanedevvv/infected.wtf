"use client";

import { useEffect } from "react";

export default function CursorTrail({ color = "#39ff14" }: { color?: string }) {
  useEffect(() => {
    if ("ontouchstart" in window) return;

    const count = 10;
    const dots: { el: HTMLDivElement; x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const d = document.createElement("div");
      const sz = Math.max(2, 6 - i * 0.4);
      d.style.cssText = `width:${sz}px;height:${sz}px;background:${color};border-radius:50%;position:fixed;pointer-events:none;z-index:9998;opacity:0;mix-blend-mode:screen;will-change:transform;`;
      document.body.appendChild(d);
      dots.push({ el: d, x: 0, y: 0 });
    }

    const mouse = { x: 0, y: 0 };
    function onMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }
    document.addEventListener("mousemove", onMove);

    let raf = 0;
    function animate() {
      let x = mouse.x;
      let y = mouse.y;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        d.x += (x - d.x) * (0.18 + i * 0.005);
        d.y += (y - d.y) * (0.18 + i * 0.005);
        const op = (1 - i / dots.length) * 0.55;
        d.el.style.opacity = String(op);
        d.el.style.left = d.x - parseFloat(d.el.style.width) / 2 + "px";
        d.el.style.top = d.y - parseFloat(d.el.style.height) / 2 + "px";
        x = d.x;
        y = d.y;
      }
      raf = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      dots.forEach((d) => d.el.remove());
    };
  }, [color]);

  return null;
}
