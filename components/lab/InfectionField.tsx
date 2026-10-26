"use client";

import { useEffect, useRef } from "react";

// A grid of cells the pointer infects. Infected cells spread to their neighbours and slowly heal,
// so moving the mouse leaves a growing, fading colony behind. A few cells flare up on their own.
export default function InfectionField({ cell = 14, className }: { cell?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const accent = getComputedStyle(canvas).getPropertyValue("--accent").trim() || "#c6ff3d";

    let cols = 0, rows = 0, dpr = 1;
    let grid = new Float32Array(0);
    let next = new Float32Array(0);
    const pointer = { x: -1, y: -1, active: false };

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(rect.width * dpr);
      canvas!.height = Math.round(rect.height * dpr);
      cols = Math.ceil(rect.width / cell);
      rows = Math.ceil(rect.height / cell);
      grid = new Float32Array(cols * rows);
      next = new Float32Array(cols * rows);
      draw();
    }

    function infect(cx: number, cy: number, r: number, amount: number) {
      for (let y = Math.max(0, cy - r); y <= Math.min(rows - 1, cy + r); y++) {
        for (let x = Math.max(0, cx - r); x <= Math.min(cols - 1, cx + r); x++) {
          const d = Math.hypot(x - cx, y - cy);
          if (d <= r) grid[y * cols + x] = Math.min(1, grid[y * cols + x] + amount * (1 - d / (r + 1)));
        }
      }
    }

    function step() {
      if (pointer.active) infect(Math.floor(pointer.x / cell), Math.floor(pointer.y / cell), 2, 0.55);
      if (Math.random() < 0.06) infect(Math.floor(Math.random() * cols), Math.floor(Math.random() * rows), 1, 0.9);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          let v = grid[i] * 0.965;
          if (v < 0.3) {
            // catch it from a strongly infected neighbour
            const n = (x > 0 ? grid[i - 1] : 0) + (x < cols - 1 ? grid[i + 1] : 0) + (y > 0 ? grid[i - cols] : 0) + (y < rows - 1 ? grid[i + cols] : 0);
            if (n > 1.4 && Math.random() < 0.035) v = 0.75;
          }
          next[i] = v < 0.01 ? 0 : v;
        }
      }
      [grid, next] = [next, grid];
    }

    function draw() {
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, cols * cell, rows * cell);
      ctx!.fillStyle = "rgba(230,238,210,0.09)";
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) ctx!.fillRect(x * cell + cell / 2 - 0.5, y * cell + cell / 2 - 0.5, 1, 1);
      ctx!.fillStyle = accent;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const v = grid[y * cols + x];
          if (v <= 0.02) continue;
          const s = Math.max(1.5, (cell - 3) * Math.min(1, v * 1.15));
          ctx!.globalAlpha = Math.min(1, v * 0.95);
          ctx!.fillRect(x * cell + (cell - s) / 2, y * cell + (cell - s) / 2, s, s);
        }
      }
      ctx!.globalAlpha = 1;
    }

    resize();
    if (reduced) {
      for (let k = 0; k < 40; k++) infect(Math.floor(Math.random() * cols), Math.floor(Math.random() * rows), 2, 0.5);
      draw();
      return;
    }

    let raf = 0, visible = true, last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || t - last < 33) return;
      last = t;
      step();
      draw();
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.active = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= r.width && pointer.y <= r.height;
    };
    const onLeave = () => { pointer.active = false; };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [cell]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
