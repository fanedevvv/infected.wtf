"use client";

import LogoLoop from "@/components/ui/LogoLoop";
import { SiDiscord, SiSpotify, SiInstagram, SiTiktok, SiYoutube, SiGithub, SiSteam, SiTwitch, SiX, SiTelegram, SiSoundcloud, SiRoblox, SiReddit, SiKick } from "react-icons/si";

// Platforms people link from their profile; brand colour shows on hover.
const PLATFORMS = [
  { node: <SiDiscord />, title: "Discord", hoverColor: "#5865f2" },
  { node: <SiSpotify />, title: "Spotify", hoverColor: "#1db954" },
  { node: <SiInstagram />, title: "Instagram", hoverColor: "#e1306c" },
  { node: <SiTiktok />, title: "TikTok", hoverColor: "#ffffff" },
  { node: <SiYoutube />, title: "YouTube", hoverColor: "#ff0033" },
  { node: <SiGithub />, title: "GitHub", hoverColor: "#ffffff" },
  { node: <SiSteam />, title: "Steam", hoverColor: "#66c0f4" },
  { node: <SiTwitch />, title: "Twitch", hoverColor: "#9146ff" },
  { node: <SiX />, title: "X", hoverColor: "#ffffff" },
  { node: <SiTelegram />, title: "Telegram", hoverColor: "#26a5e4" },
  { node: <SiSoundcloud />, title: "SoundCloud", hoverColor: "#ff5500" },
  { node: <SiRoblox />, title: "Roblox", hoverColor: "#ffffff" },
  { node: <SiReddit />, title: "Reddit", hoverColor: "#ff4500" },
  { node: <SiKick />, title: "Kick", hoverColor: "#53fc18" },
];

export default function PlatformStrip() {
  return (
    <section className="platform-strip" aria-label="Supported platforms">
      <LogoLoop
        logos={PLATFORMS}
        speed={60}
        direction="left"
        logoHeight={30}
        gap={64}
        hoverSpeed={15}
        scaleOnHover
        muted={0.5}
        labels="hover"
        fadeOut
        fadeOutWidth={0.18}
        ariaLabel="Supported platforms"
      />
    </section>
  );
}
