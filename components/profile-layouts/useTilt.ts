"use client";

import { useEffect, useState } from "react";

/**
 * 3D tilt toward the pointer (or with the phone's gyroscope). The rotation is written straight to the element's
 * transform, and --mx/--my (pointer position) and --hyp (distance from centre, 0–1) only onto its [data-tilt-fx]
 * children (foil, glare, sheen) — setting them on the element itself would restyle its whole subtree on every
 * pointer move. Pass perspective=0 when a parent already sets one. Off for reduced motion.
 * Returns whether the element is currently being tilted.
 */
export function useTilt(ref: React.RefObject<HTMLElement | null>, maxY = 16, maxX = 12, perspective = 1300) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let visible = true;
    let last = { x: 0.5, y: 0.5 };
    // Gyro: smoothed, and ignored below a small dead-zone — raw sensor noise otherwise keeps the element (and any
    // foil/glare on it) repainting 60×/s while the phone lies still, which reads as flickering text.
    let smooth = { x: 0.5, y: 0.5 };
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { rootMargin: "100px" });
    io.observe(el);
    const fx = Array.from(el.querySelectorAll<HTMLElement>("[data-tilt-fx]"));
    const persp = perspective ? `perspective(${perspective}px) ` : "";
    const set = (px: number, py: number) => {
      if (Math.abs(px - last.x) < 0.004 && Math.abs(py - last.y) < 0.004) return;
      last = { x: px, y: py };
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.transform = `${persp}rotateX(${(0.5 - py) * maxX}deg) rotateY(${(px - 0.5) * maxY}deg)`;
        const hyp = String(Math.min(1, Math.hypot(px - 0.5, py - 0.5) * 1.6));
        for (const n of fx) {
          n.style.setProperty("--mx", `${px * 100}%`);
          n.style.setProperty("--my", `${py * 100}%`);
          n.style.setProperty("--hyp", hyp);
        }
      });
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      set(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
      setActive(true);
    };
    const onLeave = () => { set(0.5, 0.5); setActive(false); };
    // Phones: tilt with the device (browsers that allow it without a permission prompt).
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null || !visible || document.hidden) return;
      const tx = Math.min(1, Math.max(0, 0.5 + e.gamma / 50));
      const ty = Math.min(1, Math.max(0, 0.5 + (e.beta - 40) / 60));
      smooth = { x: smooth.x + (tx - smooth.x) * 0.15, y: smooth.y + (ty - smooth.y) * 0.15 };
      if (Math.abs(smooth.x - last.x) < 0.02 && Math.abs(smooth.y - last.y) < 0.02) return;
      set(Math.round(smooth.x * 100) / 100, Math.round(smooth.y * 100) / 100);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    window.addEventListener("deviceorientation", onTilt);
    onLeave();
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("deviceorientation", onTilt);
    };
  }, [ref, maxX, maxY, perspective]);
  return active;
}
