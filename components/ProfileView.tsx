"use client";

import { useState } from "react";
import MusicPlayer from "./MusicPlayer";
import ParticleBackground from "./ParticleBackground";
import CursorTrail from "./CursorTrail";
import type { GameIntegration } from "./GameIntegrationCards";
import PurchasedEffectsEngine from "./PurchasedEffectsEngine";
import type { ProfileProjectCard } from "./ProfileProjects";
import ReportProfileModal from "./ReportProfileModal";
import ProfileImmersive from "./ProfileImmersive";
import ProfileClassic from "./ProfileClassic";

export interface ProfileViewProps {
  username: string;
  displayName: string;
  bio: string | null;
  location: string | null;
  job: string | null;
  age: number | null;
  banner: string | null;
  avatar: string | null;
  avatarShape: string;
  avatarRing: "none" | "normal" | "premium";
  activeDecoration?: string | null;
  accentColor: string;
  backgroundColor: string;
  nameColor: string;
  bioColor: string;
  overlayColor: string;
  backgroundType: string;
  backgroundValue: string;
  isPremium: boolean;
  particleEffect: boolean;
  cursorTrail: boolean;
  nameEffect: string;
  bioEffect: string;
  musicTracks: string[];
  playlistStyle: string;
  profileFont: string;
  views: number;
  createdAt: string;
  isOwner: boolean;
  socialLinks: { id: number; platform: string; url: string }[];
  badges: { id: string; label: string; color?: string }[];
  cursorPath: string | null;
  discordInt: { discordUserId: string; discordUsername: string; discordGlobalName: string | null; discordAvatar: string | null } | null;
  discordServerInt: { invite: string; serverName: string; serverIcon: string | null; serverId: string; online: number; total: number } | null;
  gameIntegrations: GameIntegration[];
  projects: ProfileProjectCard[];
  skills: { id: number; name: string; level: number }[];
  bestFriend: { slug: string; displayName: string; avatar: string | null } | null;
  layoutTemplate: string;
  purchasedEffects: string[];
  activeCursorEffect: string;
  activeAvatarEffect: string;
  activeBgEffect: string;
  likeCount: number;
  likedByViewer: boolean;
  dislikeCount: number;
  dislikedByViewer: boolean;
  weather: { tempC: number; code: number; description: string; location: string } | null;
  clock: { timezone: string; format24h: boolean; location: string } | null;
  viewerLoggedIn: boolean;
  /** Skip the "click to enter" splash (used by the dashboard's live preview). */
  autoEnter?: boolean;
}

export default function ProfileView(p: ProfileViewProps) {
  const [entered, setEntered] = useState(!!p.autoEnter);
  const [liked, setLiked] = useState(p.likedByViewer);
  const [likeCount, setLikeCount] = useState(p.likeCount);
  const [disliked, setDisliked] = useState(p.dislikedByViewer);
  const [dislikeCount, setDislikeCount] = useState(p.dislikeCount);
  const [likeBusy, setLikeBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  async function rate(action: "like" | "dislike") {
    if (!p.viewerLoggedIn) {
      window.location.href = "/login";
      return;
    }
    if (likeBusy) return;
    setLikeBusy(true);
    const prev = { liked, likeCount, disliked, dislikeCount };
    if (action === "like") {
      setLiked(!liked);
      setLikeCount(likeCount + (liked ? -1 : 1));
      if (disliked) { setDisliked(false); setDislikeCount(dislikeCount - 1); }
    } else {
      setDisliked(!disliked);
      setDislikeCount(dislikeCount + (disliked ? -1 : 1));
      if (liked) { setLiked(false); setLikeCount(likeCount - 1); }
    }
    const restore = () => {
      setLiked(prev.liked); setLikeCount(prev.likeCount);
      setDisliked(prev.disliked); setDislikeCount(prev.dislikeCount);
    };
    try {
      const res = await fetch("/api/profile-like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: p.username, action }),
      });
      const data = await res.json();
      if (data.success) {
        setLiked(data.liked); setLikeCount(data.count);
        setDisliked(data.disliked); setDislikeCount(data.dislikeCount);
      } else {
        restore();
      }
    } catch {
      restore();
    }
    setLikeBusy(false);
  }

  function enter() {
    setEntered(true);
  }

  const hasActiveAvatarEffect = !!(p.activeAvatarEffect && p.purchasedEffects.includes(p.activeAvatarEffect));
  const PREMIUM_LAYOUTS = ["aurora", "cinematic", "dossier"];
  const effectiveLayout = PREMIUM_LAYOUTS.includes(p.layoutTemplate) && !p.isPremium ? "modern" : p.layoutTemplate;

  const bgStyle: React.CSSProperties =
    p.backgroundType === "color" || p.backgroundType === "gradient"
      ? { background: p.backgroundValue }
      : p.backgroundType === "image"
        ? { backgroundImage: `url(/${p.backgroundValue})`, backgroundSize: "cover", backgroundPosition: "center" }
        : { background: p.backgroundColor };

  const paletteVars = {
    ["--accent" as string]: p.accentColor,
    ["--profile-name-color" as string]: p.nameColor,
    ["--profile-bio-color" as string]: p.bioColor,
    ["--profile-overlay" as string]: p.overlayColor,
  };

  return (
    <div className="profile-body" style={paletteVars}>
      {!entered && (
        <div id="splash-screen" onClick={enter}>
          <div id="splash-text">
            click to enter<span className="splash-dots">...</span>
          </div>
        </div>
      )}

      <div
        id="profile-content"
        style={{ opacity: entered ? 1 : 0, pointerEvents: entered ? "auto" : "none", transition: "opacity .7s ease" }}
      >
        <div id="profile-bg" style={bgStyle} />
        {p.backgroundType === "video" && (
          <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden" }}>
            <video id="bg-video" autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute" }}>
              <source src={`/${p.backgroundValue}`} />
            </video>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          </div>
        )}
        {entered && p.isPremium && p.particleEffect && <ParticleBackground />}
        {entered && p.isPremium && p.cursorTrail && <CursorTrail color={p.accentColor} />}
        {entered && (
          <PurchasedEffectsEngine
            purchasedEffects={p.purchasedEffects}
            activeCursorEffect={p.activeCursorEffect}
            activeAvatarEffect={p.activeAvatarEffect}
            activeBgEffect={p.activeBgEffect}
            avatarShape={p.avatarShape}
            cursorTrailEnabled={p.isPremium && p.cursorTrail}
            customCursorUrl={p.cursorPath ? `/${p.cursorPath}` : null}
          />
        )}
        {p.musicTracks.length > 0 && (
          <MusicPlayer tracks={p.musicTracks} style={p.playlistStyle} active={entered} />
        )}

        {/* "modern" is the full-bleed sidebar+tabs layout (lethal.wtf-style); every
            other value renders the original card family via ProfileClassic, with
            the same profile-card--{layout} CSS the dashboard picker has always had. */}
        {effectiveLayout === "modern" ? (
          <ProfileImmersive
            p={p}
            entered={entered}
            hasActiveAvatarEffect={hasActiveAvatarEffect}
            liked={liked}
            likeCount={likeCount}
            disliked={disliked}
            dislikeCount={dislikeCount}
            likeBusy={likeBusy}
            onRate={rate}
            onReport={() => setReportOpen(true)}
          />
        ) : (
          <ProfileClassic
            p={p}
            entered={entered}
            layout={effectiveLayout}
            liked={liked}
            likeCount={likeCount}
            disliked={disliked}
            dislikeCount={dislikeCount}
            likeBusy={likeBusy}
            onRate={rate}
            onReport={() => setReportOpen(true)}
          />
        )}

        {reportOpen && <ReportProfileModal slug={p.username} onClose={() => setReportOpen(false)} />}

      </div>
    </div>
  );
}
