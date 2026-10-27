import path from "node:path";
import { readFile } from "node:fs/promises";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { publicImageDataUrl } from "@/lib/og-image";
import { getProfileBadges } from "@/lib/badges";
import { ALL_BADGES } from "@/lib/badge-defs";
import { BADGE_ICON } from "@/lib/badge-icons";
import { OG_ACCENT, OG_BG, OG_INK, OgMark } from "@/lib/og-brand";

export const alt = "infected.wtf profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Badge colours as they appear on the profile (globals.css), where they differ from ALL_BADGES.
const BADGE_COLOR_OVERRIDES: Record<string, string> = { admin: "#7c3aed", champion: "#e8e8e8", promoter_elite: "#d1d5db", premium: "#ffd700" };

const PREMIUM_ICON = (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.3)" stroke="#ffd700" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="#ffd700" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);
const FALLBACK_ICON = <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /></svg>;

async function loadFonts() {
  const dir = path.join(process.cwd(), "assets", "fonts");
  const files: [string, 400 | 800][] = [
    ["inter-latin-400-normal.woff", 400], ["inter-latin-ext-400-normal.woff", 400],
    ["inter-latin-800-normal.woff", 800], ["inter-latin-ext-800-normal.woff", 800],
  ];
  const fonts = await Promise.all(files.map(async ([file, weight]) => {
    try {
      return { name: "Inter", data: await readFile(path.join(dir, file)), weight, style: "normal" as const };
    } catch {
      return null;
    }
  }));
  return fonts.filter((f) => f !== null);
}

/** Satori needs explicit size/fill on SVGs; currentColor isn't resolved, so the colour is baked in. */
function sizedIcon(icon: ReactNode, color: string, px: number) {
  if (!isValidElement(icon)) return null;
  return cloneElement(icon as ReactElement<Record<string, unknown>>, { width: px, height: px, fill: (icon.props as { fill?: string }).fill === "none" ? "none" : color });
}

// Profile card shown in Discord/Twitter/etc. link embeds.
export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username: slug } = await params;
  const profile = await prisma.profile.findUnique({ where: { slug }, include: { user: { select: { username: true, banned: true } } } });

  const fonts = await loadFonts();
  const options = { ...size, fonts };

  if (!profile || profile.user.banned) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 28, background: OG_BG, color: OG_INK, fontSize: 72, fontWeight: 800, letterSpacing: 2, borderBottom: `14px solid ${OG_ACCENT}` }}>
          <OgMark size={96} />
          INFECTED.WTF
        </div>
      ),
      options,
    );
  }

  const displayName = profile.displayName || profile.user.username;
  const bgImagePath = profile.banner || (profile.backgroundType === "image" ? profile.backgroundValue : null);
  const [avatar, bgImage, badges] = await Promise.all([
    publicImageDataUrl(profile.avatar || "assets/img/default-avatar.png", 220, 220),
    publicImageDataUrl(bgImagePath, 1200, 630),
    getProfileBadges(profile.id).catch(() => []),
  ]);
  const background = profile.backgroundType === "color" || profile.backgroundType === "gradient"
    ? profile.backgroundValue || profile.backgroundColor
    : profile.backgroundColor;
  // Every avatar shape is inscribed in the avatar's circle, so the embed card uses that circle.
  const avatarRadius = 110;
  const bio = (profile.bio || "").length > 110 ? `${profile.bio!.slice(0, 107)}…` : profile.bio || "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background, fontFamily: "Inter" }}>
        {bgImage && <img src={bgImage} width={1200} height={630} alt="" style={{ position: "absolute", inset: 0, objectFit: "cover", opacity: 0.45 }} />}
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(180deg, rgba(0,0,0,.25) 0%, rgba(0,0,0,.7) 100%)" }} />

        <div style={{ position: "absolute", top: 40, left: 48, display: "flex", alignItems: "center", gap: 14 }}>
          <OgMark size={44} />
          <span style={{ color: "#fff", fontSize: 30, fontWeight: 800, letterSpacing: 1 }}>INFECTED.WTF</span>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 30 }}>
          {avatar && (
            <img
              src={avatar}
              width={180}
              height={180}
              alt=""
              style={{ borderRadius: avatarRadius, border: `5px solid ${profile.accentColor}`, boxShadow: `0 0 60px ${profile.accentColor}88` }}
            />
          )}
          <div style={{ display: "flex", marginTop: 20, fontSize: 66, fontWeight: 800, color: profile.nameColor, letterSpacing: -1 }}>{displayName}</div>
          <div style={{ display: "flex", marginTop: 4, fontSize: 30, color: "rgba(255,255,255,.6)" }}>@{profile.slug}</div>
          {bio && <div style={{ display: "flex", marginTop: 18, maxWidth: 900, textAlign: "center", fontSize: 30, color: profile.bioColor }}>{bio}</div>}
          {badges.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 24, maxWidth: 900 }}>
              {badges.slice(0, 14).map((b) => {
                const color = BADGE_COLOR_OVERRIDES[b.id] || ALL_BADGES[b.id]?.color || b.color || "#ffffff";
                const icon = b.id === "premium" ? PREMIUM_ICON : BADGE_ICON[b.id] || FALLBACK_ICON;
                return (
                  <div key={b.id} style={{ width: 52, height: 52, borderRadius: 26, display: "flex", alignItems: "center", justifyContent: "center", background: `${color}26`, border: `2px solid ${color}80`, boxShadow: `0 0 18px ${color}55` }}>
                    {sizedIcon(icon, color, 26)}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 10, display: "flex", background: profile.accentColor }} />
      </div>
    ),
    options,
  );
}
