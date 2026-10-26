import path from "node:path";
import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import { OG_ACCENT, OG_BG, OG_INK, OgMark } from "@/lib/og-brand";

export const alt = "infected.wtf — one link that spreads every side of you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadInter800() {
  try {
    return [{ name: "Inter", data: await readFile(path.join(process.cwd(), "assets", "fonts", "inter-latin-800-normal.woff")), weight: 800 as const, style: "normal" as const }];
  } catch {
    return [];
  }
}

// Link embed for the site itself (Discord, X, etc.), in the "strain lab" look.
export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: OG_BG, color: OG_INK, fontFamily: "Inter", padding: "56px 64px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, fontWeight: 800, letterSpacing: 2 }}>
          <OgMark size={44} />
          INFECTED.WTF
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", fontSize: 118, fontWeight: 800, lineHeight: 0.92, letterSpacing: -2, textTransform: "uppercase" }}>
          <span>One link.</span>
          <span style={{ color: OG_ACCENT }}>Total infection.</span>
        </div>
        <div style={{ display: "flex", marginTop: 34, fontSize: 28, color: "rgba(231,235,219,.6)" }}>
          Links, music, Discord presence and effects — on one page.
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 18, display: "flex", background: `repeating-linear-gradient(-45deg, ${OG_ACCENT} 0 18px, ${OG_BG} 18px 36px)` }} />
      </div>
    ),
    { ...size, fonts: await loadInter800() },
  );
}
