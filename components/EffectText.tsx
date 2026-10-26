"use client";

import { useEffect, useState } from "react";

export type TextEffect = "none" | "glow" | "rainbow" | "shake" | "glitch" | "scramble" | "shine" | "typewriter" | "flip";

export const TEXT_EFFECTS: { id: TextEffect; label: string }[] = [
  { id: "none", label: "None" },
  { id: "glow", label: "Glow" },
  { id: "rainbow", label: "Rainbow" },
  { id: "shake", label: "Shake" },
  { id: "glitch", label: "Glitch" },
  { id: "scramble", label: "Scramble" },
  { id: "shine", label: "Shine" },
  { id: "typewriter", label: "Typewriter" },
  { id: "flip", label: "Flip" },
];

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*";

export default function EffectText({
  text,
  effect,
  active,
  as: Tag = "span",
  className = "",
}: {
  text: string;
  effect: string;
  active: boolean;
  as?: "span" | "div";
  className?: string;
}) {
  const [display, setDisplay] = useState(effect === "typewriter" || effect === "scramble" ? "" : text);

  useEffect(() => {
    if (!active) return;

    if (effect === "typewriter") {
      let i = 0, deleting = false, pause = 0;
      let timer: ReturnType<typeof setTimeout>;
      function tick() {
        if (pause > 0) { pause--; timer = setTimeout(tick, 80); return; }
        if (!deleting) {
          i++;
          setDisplay(text.slice(0, i));
          if (i >= text.length) { pause = 22; deleting = true; }
        } else {
          i--;
          setDisplay(text.slice(0, i));
          if (i <= 0) { pause = 10; deleting = false; }
        }
        timer = setTimeout(tick, deleting ? 55 : 100 + Math.random() * 40);
      }
      timer = setTimeout(tick, 900);
      return () => clearTimeout(timer);
    }

    if (effect === "scramble") {
      let frame = 0;
      const totalFrames = 18;
      const timer = setInterval(() => {
        frame++;
        const revealCount = Math.floor((frame / totalFrames) * text.length);
        let out = "";
        for (let idx = 0; idx < text.length; idx++) {
          if (text[idx] === " ") { out += " "; continue; }
          out += idx < revealCount ? text[idx] : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
        setDisplay(out);
        if (frame >= totalFrames) { setDisplay(text); clearInterval(timer); }
      }, 45);
      return () => clearInterval(timer);
    }
  }, [active, effect, text]);

  if (effect === "glitch") {
    return <Tag className={`${className} fx-glitch`} data-text={text}>{text}</Tag>;
  }
  if (effect === "glow" || effect === "rainbow" || effect === "shake" || effect === "shine" || effect === "flip") {
    return <Tag className={`${className} fx-${effect}`}>{text}</Tag>;
  }
  if (effect === "typewriter" || effect === "scramble") {
    return <Tag className={className}>{display}</Tag>;
  }
  return <Tag className={className}>{text}</Tag>;
}
