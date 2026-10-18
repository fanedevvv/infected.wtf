"use client";

import { useEffect } from "react";

// Moves every [data-parallax="<speed>"] element vertically as the page scrolls.
// Uses the standalone `translate` property so it composes with fade-in keyframes
// that animate `transform`. Offset starts at 0 once the element enters the viewport.
export default function Parallax() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const mobile = window.matchMedia("(max-width: 767px)");

    let items: { el: HTMLElement; speed: number; top: number }[] = [];
    const measure = () => {
      items = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]")).map((el) => {
        el.style.translate = "";
        return { el, speed: parseFloat(el.dataset.parallax || "0"), top: el.getBoundingClientRect().top + window.scrollY };
      });
      update();
    };

    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const vh = window.innerHeight;
      for (const it of items) {
        if (mobile.matches) { it.el.style.translate = ""; continue; }
        const progress = Math.max(0, y - Math.max(0, it.top - vh));
        it.el.style.translate = `0 ${(progress * it.speed).toFixed(1)}px`;
      }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, []);
  return null;
}
