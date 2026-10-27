"use client";

import { useEffect, useRef } from "react";
import { profileFontFamily, googleFontsHref } from "@/lib/profile-fonts";
import {
  Avatar, Badges, BelowFold, BestFriend, Bio, DisplayName, Footer, MetaRow, OwnerEdit, Skills, SocialIcons, Widgets,
  type LayoutProps,
} from "./profile-layouts/parts";

/** Classic Card: avatar and name centred on a card that tilts toward the cursor. */
export default function ProfileClassic({ p, entered, ...votes }: LayoutProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entered || !cardRef.current) return;
    const card = cardRef.current;
    if (window.matchMedia("(pointer:coarse)").matches) return;
    const MAX = 6;
    let rafId: number | null = null;
    let targetX = 0, targetY = 0, currentX = 0, currentY = 0, inside = false;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    function animate() {
      currentX = lerp(currentX, targetX, 0.08);
      currentY = lerp(currentY, targetY, 0.08);
      const sc = inside ? 1.02 : 1;
      card.style.transform = `perspective(900px) rotateX(${currentX}deg) rotateY(${currentY}deg) scale(${sc})`;
      if (Math.abs(currentX - targetX) > 0.01 || Math.abs(currentY - targetY) > 0.01) {
        rafId = requestAnimationFrame(animate);
      } else rafId = null;
    }
    function startRaf() { if (!rafId) rafId = requestAnimationFrame(animate); }
    function onMove(e: MouseEvent) {
      const r = card.getBoundingClientRect();
      targetY = ((e.clientX - r.left - r.width / 2) / (r.width / 2)) * MAX;
      targetX = -((e.clientY - r.top - r.height / 2) / (r.height / 2)) * MAX;
      startRaf();
    }
    function onEnter() { inside = true; startRaf(); }
    function onLeave() { inside = false; targetX = 0; targetY = 0; startRaf(); }
    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseenter", onEnter);
    card.addEventListener("mouseleave", onLeave);
    return () => {
      card.removeEventListener("mousemove", onMove);
      card.removeEventListener("mouseenter", onEnter);
      card.removeEventListener("mouseleave", onLeave);
    };
  }, [entered]);

  const fontFamily = profileFontFamily(p.profileFont);
  const fontHref = googleFontsHref([p.profileFont]);

  return (
    <div style={fontFamily ? { fontFamily } : undefined}>
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      <OwnerEdit p={p} />

      <div className="profile-wrapper profile-wrapper--classic">
        <div className="profile-card profile-card--classic" ref={cardRef}>
          {p.banner && <div className="profile-banner-img fade-in" style={{ backgroundImage: `url(/${p.banner})` }} />}
          <Avatar p={p} withBanner={!!p.banner} />
          <DisplayName p={p} entered={entered} />
          <Badges p={p} />
          <Bio p={p} entered={entered} quoted />
          <BestFriend p={p} />
          <MetaRow p={p} />
          <SocialIcons p={p} />
          <Widgets p={p} />
          <Skills p={p} />
          <Footer p={p} {...votes} />
        </div>
      </div>

      <BelowFold p={p} entered={entered} />
    </div>
  );
}
