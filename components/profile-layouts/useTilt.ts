"use client";

import { useEffect, useState } from "react";

/**
 * 3D tilt toward the pointer (or with the phone's gyroscope): writes --rx/--ry (rotation), --mx/--my (pointer
 * position, for glare/foil) and --hyp (distance from centre, 0–1) onto the element. Off for reduced motion.
 * Returns whether the element is currently being tilted.
 */
export function useTilt(ref: React.RefObject<HTMLElement | null>, maxY = 16, maxX = 12) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const set = (px: number, py: number) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
        el.style.setProperty("--ry", `${(px - 0.5) * maxY}deg`);
        el.style.setProperty("--rx", `${(0.5 - py) * maxX}deg`);
        el.style.setProperty("--hyp", String(Math.min(1, Math.hypot(px - 0.5, py - 0.5) * 1.6)));
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
      if (e.beta == null || e.gamma == null) return;
      set(Math.min(1, Math.max(0, 0.5 + e.gamma / 50)), Math.min(1, Math.max(0, 0.5 + (e.beta - 40) / 60)));
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    window.addEventListener("deviceorientation", onTilt);
    onLeave();
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("deviceorientation", onTilt);
    };
  }, [ref, maxX, maxY]);
  return active;
}
