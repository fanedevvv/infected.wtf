"use client";

import { useEffect, useRef, useState } from "react";

// Counts from zero to `value` the first time it scrolls into view.
export default function CountUp({ value, format }: { value: number; format: "compact" | "full" }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setN(0);
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / 1400);
        setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return <span ref={ref}>{format === "compact" ? compact(n) : n.toLocaleString("en-US")}</span>;
}

function compact(n: number): string {
  if (n >= 1000000) return Math.round((n / 1000000) * 10) / 10 + "M";
  if (n >= 1000) return Math.floor(n / 100) / 10 + "K";
  return String(n);
}
