import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { publicImageDataUrl } from "@/lib/og-image";

export const alt = "infected.wtf profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Profile card shown in Discord/Twitter/etc. link embeds.
export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username: slug } = await params;
  const profile = await prisma.profile.findUnique({ where: { slug }, include: { user: { select: { username: true, banned: true } } } });

  const logo = await publicImageDataUrl("assets/img/logo-icon.png", 72, 72, "contain");

  if (!profile || profile.user.banned) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 24, background: "#050507", color: "#fff", fontSize: 64, fontWeight: 800 }}>
          {logo && <img src={logo} width={96} height={96} alt="" />}
          INFECTED.WTF
        </div>
      ),
      size,
    );
  }

  const displayName = profile.displayName || profile.user.username;
  const bgImagePath = profile.banner || (profile.backgroundType === "image" ? profile.backgroundValue : null);
  const [avatar, bgImage] = await Promise.all([
    publicImageDataUrl(profile.avatar || "assets/img/default-avatar.png", 220, 220),
    publicImageDataUrl(bgImagePath, 1200, 630),
  ]);
  const background = profile.backgroundType === "color" || profile.backgroundType === "gradient"
    ? profile.backgroundValue || profile.backgroundColor
    : profile.backgroundColor;
  const avatarRadius = profile.avatarShape === "square" ? 24 : profile.avatarShape === "soft" || profile.avatarShape === "rounded" ? 56 : 110;
  const bio = (profile.bio || "").length > 110 ? `${profile.bio!.slice(0, 107)}…` : profile.bio || "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background, fontFamily: "sans-serif" }}>
        {bgImage && <img src={bgImage} width={1200} height={630} alt="" style={{ position: "absolute", inset: 0, objectFit: "cover", opacity: 0.45 }} />}
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(180deg, rgba(0,0,0,.25) 0%, rgba(0,0,0,.7) 100%)" }} />

        <div style={{ position: "absolute", top: 40, left: 48, display: "flex", alignItems: "center", gap: 14 }}>
          {logo && <img src={logo} width={52} height={52} alt="" />}
          <span style={{ color: "#fff", fontSize: 30, fontWeight: 800, letterSpacing: 1 }}>INFECTED.WTF</span>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 30 }}>
          {avatar && (
            <img
              src={avatar}
              width={200}
              height={200}
              alt=""
              style={{ borderRadius: avatarRadius, border: `5px solid ${profile.accentColor}`, boxShadow: `0 0 60px ${profile.accentColor}88` }}
            />
          )}
          <div style={{ display: "flex", marginTop: 26, fontSize: 68, fontWeight: 800, color: profile.nameColor, letterSpacing: -1 }}>{displayName}</div>
          <div style={{ display: "flex", marginTop: 4, fontSize: 30, color: "rgba(255,255,255,.6)" }}>@{profile.slug}</div>
          {bio && <div style={{ display: "flex", marginTop: 18, maxWidth: 900, textAlign: "center", fontSize: 30, color: profile.bioColor }}>{bio}</div>}
        </div>

        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 10, display: "flex", background: profile.accentColor }} />
      </div>
    ),
    size,
  );
}
