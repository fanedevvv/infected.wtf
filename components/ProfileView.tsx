"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import EffectText from "./EffectText";
import MusicPlayer from "./MusicPlayer";
import ParticleBackground from "./ParticleBackground";
import CursorTrail from "./CursorTrail";
import DiscordPresenceCard from "./DiscordPresenceCard";
import DiscordServerCard from "./DiscordServerCard";
import GameIntegrationCards, { GameIntegration } from "./GameIntegrationCards";
import SpotifyPresenceCard from "./SpotifyPresenceCard";
import PurchasedEffectsEngine from "./PurchasedEffectsEngine";
import { DecorationFrame } from "./DecorationSVGs";
import { BADGE_ICON } from "@/lib/badge-icons";
import { openSteamInApp } from "@/lib/app-links";
import ProfileComments from "./ProfileComments";
import ProfileProjects, { type ProfileProjectCard } from "./ProfileProjects";
import ReportProfileModal from "./ReportProfileModal";
import WeatherWidget from "./WeatherWidget";
import ProfileViewSocial from "./ProfileViewSocial";

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  discord: (
    <svg viewBox="0 0 127.14 96.36" fill="currentColor">
      <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z" />
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  twitch: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
  steam: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z" />
    </svg>
  ),
  spotify: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  ),
  website: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  ),
};

const PLATFORM_COLOR: Record<string, string> = {
  steam: "#1b2838", spotify: "#1DB954", discord: "#5865F2", instagram: "#E1306C",
  twitter: "#000000", youtube: "#FF0000", twitch: "#9146FF", github: "#333333",
  tiktok: "#010101", website: "#555555",
};

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
  viewerLoggedIn: boolean;
  /** Skip the "click to enter" splash (used by the dashboard's live preview). */
  autoEnter?: boolean;
}

export default function ProfileView(p: ProfileViewProps) {
  const [entered, setEntered] = useState(!!p.autoEnter);
  const cardRef = useRef<HTMLDivElement>(null);
  const [liked, setLiked] = useState(p.likedByViewer);
  const [likeCount, setLikeCount] = useState(p.likeCount);
  const [disliked, setDisliked] = useState(p.dislikedByViewer);
  const [dislikeCount, setDislikeCount] = useState(p.dislikeCount);
  const [likeBusy, setLikeBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const spotifyIntegration = p.gameIntegrations.find((it) => it.type === "spotify");
  const gameIntegrationsNoSpotify = p.gameIntegrations.filter((it) => it.type !== "spotify");

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

  function enter() {
    setEntered(true);
  }

  const hasChampion = p.badges.some((b) => b.id === "champion");
  const hasActiveAvatarEffect = !!(p.activeAvatarEffect && p.purchasedEffects.includes(p.activeAvatarEffect));

  const bgStyle: React.CSSProperties =
    p.backgroundType === "color" || p.backgroundType === "gradient"
      ? { background: p.backgroundValue }
      : p.backgroundType === "image"
        ? { backgroundImage: `url(/${p.backgroundValue})`, backgroundSize: "cover", backgroundPosition: "center" }
        : { background: p.backgroundColor };

  const PREMIUM_LAYOUTS = ["aurora", "cinematic", "dossier", "social"];
  const effectiveLayout = PREMIUM_LAYOUTS.includes(p.layoutTemplate) && !p.isPremium ? "classic" : p.layoutTemplate;

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

        {p.isOwner && effectiveLayout !== "social" && (
          <div className="edit-profile-btn">
            <Link href="/dashboard" className="btn btn-secondary btn-sm">✏ Edit</Link>
          </div>
        )}

        {effectiveLayout === "social" ? (
          <ProfileViewSocial
            p={p}
            entered={entered}
            liked={liked}
            likeCount={likeCount}
            disliked={disliked}
            dislikeCount={dislikeCount}
            likeBusy={likeBusy}
            onRate={rate}
            onReport={() => setReportOpen(true)}
          />
        ) : (
        <div className={`profile-wrapper profile-wrapper--${effectiveLayout}`}>
          <div className={`profile-card profile-card--${effectiveLayout}`} ref={cardRef}>
            {p.banner && (
              <div className="profile-banner-img fade-in" style={{ backgroundImage: `url(/${p.banner})` }} />
            )}
            <div className={`avatar-wrapper fade-in avatar-shape-${p.avatarShape} ${p.banner ? "avatar-wrapper--with-banner" : ""}`}>
              {!hasActiveAvatarEffect && p.isPremium && p.avatarRing === "premium" ? (
                <>
                  <div className="avatar-ring-pulse" />
                  <div className="avatar-ring-shell ring-premium">
                    <div className="avatar-ring-spin" />
                  </div>
                </>
              ) : !hasActiveAvatarEffect && p.avatarRing === "normal" ? (
                <div className="avatar-ring-shell ring-normal">
                  <div className="avatar-ring-spin" />
                </div>
              ) : null}
              <div className="avatar-ring-inner" />
              <div className="avatar-decoration-anchor">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.avatar ? `/${p.avatar}` : "/assets/img/default-avatar.png"}
                  alt={p.displayName}
                  className="avatar-img"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/assets/img/default-avatar.png"; }}
                />
                <DecorationFrame id={p.activeDecoration} />
              </div>
              {hasActiveAvatarEffect && (
                <div className="pav-effect-wrap" data-effect={p.activeAvatarEffect}>
                  <canvas className="pav-canvas" id="pav-canvas" />
                </div>
              )}
            </div>

            <div className={`profile-username fade-in-d1 ${hasChampion ? "champion-name" : ""}`} id="profile-display-name">
              <EffectText text={p.displayName} effect={p.nameEffect} active={entered} />
            </div>

            {p.badges.length > 0 && (
              <div className="profile-badges fade-in-d1">
                {p.badges.map((b) =>
                  b.id === "premium" ? (
                    <div
                      key={b.id}
                      className="profile-badge badge-premium"
                      style={{ background: "linear-gradient(135deg,rgba(255,215,0,.2),rgba(255,160,0,.12))", border: "1.5px solid rgba(255,215,0,.55)", boxShadow: "0 0 16px rgba(255,215,0,.4)" }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" width="17" height="17" style={{ filter: "drop-shadow(0 0 5px rgba(255,215,0,.9))" }}>
                        <path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.3)" stroke="#ffd700" strokeWidth="1.8" strokeLinejoin="round" />
                        <path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="#ffd700" strokeWidth="1.4" strokeLinejoin="round" opacity=".85" />
                      </svg>
                      <span className="badge-tooltip">Infected Plus</span>
                    </div>
                  ) : (
                    <div
                      key={b.id}
                      className={`profile-badge badge-${b.id}`}
                      style={
                        !BADGE_ICON[b.id] && b.color
                          ? { background: `${b.color}22`, border: `1px solid ${b.color}55`, color: b.color }
                          : undefined
                      }
                    >
                      {BADGE_ICON[b.id] || (
                        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><circle cx="12" cy="12" r="8" /></svg>
                      )}
                      <span className="badge-tooltip">{b.label}</span>
                    </div>
                  )
                )}
              </div>
            )}

            {p.bio && (
              <p className="profile-bio fade-in-d1">
                &quot;<EffectText text={p.bio} effect={p.bioEffect} active={entered} />&quot;
              </p>
            )}

            {p.bestFriend && (
              <Link href={`/${p.bestFriend.slug}`} className="profile-bestfriend fade-in-d1" title="Best friend">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                <span>Best friend</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.bestFriend.avatar ? `/${p.bestFriend.avatar}` : "/assets/img/default-avatar.png"} alt="" />
                <b>{p.bestFriend.displayName}</b>
              </Link>
            )}

            {(p.location || p.job || p.age !== null) && (
              <div className="profile-meta-row fade-in-d2">
                {p.location && (
                  <div className="profile-location">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="#ffffff" style={{ opacity: 0.6 }}>
                      <path d="M12 2C8.686 2 6 4.686 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.314-2.686-6-6-6z" />
                      <circle cx="12" cy="8" r="2.2" fill="rgba(5,5,7,0.55)" />
                    </svg>
                    {p.location}
                  </div>
                )}
                {p.job && (
                  <div className="profile-location">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#ffffff" strokeWidth="2" style={{ opacity: 0.6 }}>
                      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    {p.job}
                  </div>
                )}
                {p.age !== null && (
                  <div className="profile-location">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#ffffff" strokeWidth="2" style={{ opacity: 0.6 }}>
                      <path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" />
                    </svg>
                    {p.age}
                  </div>
                )}
              </div>
            )}

            {p.socialLinks.length > 0 && (
              <div className="social-icons fade-in-d3">
                {p.socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => openSteamInApp(e, link.url)}
                    className="social-icon"
                    data-tooltip={link.platform[0].toUpperCase() + link.platform.slice(1)}
                    style={{ ["--platform-color" as string]: PLATFORM_COLOR[link.platform] || "#555" }}
                  >
                    {PLATFORM_ICON[link.platform] || PLATFORM_ICON.website}
                  </a>
                ))}
              </div>
            )}

            {(p.discordInt || p.discordServerInt || p.gameIntegrations.length > 0 || p.weather) && (
              <div className="integrations-grid fade-in-d3">
                {p.weather && (
                  <WeatherWidget tempC={p.weather.tempC} code={p.weather.code} description={p.weather.description} location={p.weather.location} />
                )}
                {p.discordInt && (
                  <DiscordPresenceCard
                    discordUserId={p.discordInt.discordUserId}
                    discordUsername={p.discordInt.discordUsername}
                    discordGlobalName={p.discordInt.discordGlobalName}
                    discordAvatar={p.discordInt.discordAvatar}
                  />
                )}
                {p.discordServerInt && (
                  <DiscordServerCard
                    invite={p.discordServerInt.invite}
                    serverName={p.discordServerInt.serverName}
                    serverIcon={p.discordServerInt.serverIcon}
                    serverId={p.discordServerInt.serverId}
                    online={p.discordServerInt.online}
                    total={p.discordServerInt.total}
                  />
                )}
                {spotifyIntegration?.type === "spotify" && (
                  <SpotifyPresenceCard
                    key={`${spotifyIntegration.data.nowPlaying?.trackName || "none"}-${spotifyIntegration.data.lastSyncAt}`}
                    data={spotifyIntegration.data}
                    slug={p.username}
                  />
                )}
                <GameIntegrationCards integrations={gameIntegrationsNoSpotify} />
              </div>
            )}

            {p.skills.length > 0 && (
              <div className="profile-skills fade-in-d3">
                {p.skills.map((sk) => (
                  <div className="profile-skill" key={sk.id}>
                    <div className="profile-skill-head"><span>{sk.name}</span><span>{sk.level}%</span></div>
                    <div className="profile-skill-bar"><span style={{ width: `${Math.max(2, Math.min(100, sk.level))}%` }} /></div>
                  </div>
                ))}
              </div>
            )}

            <div className="fade-in-d4" style={{ marginTop: ".85rem" }}>
              <div className="profile-views-row">
                <div className="profile-views-pill">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                  {p.views.toLocaleString()}
                </div>
                <button
                  className={`profile-like-pill ${liked ? "liked" : ""}`}
                  onClick={() => rate("like")}
                  disabled={likeBusy || p.isOwner}
                  title={p.isOwner ? "Likes" : liked ? "Remove like" : "Like this profile"}
                >
                  <svg viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                    <path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z" />
                  </svg>
                  {likeCount.toLocaleString()}
                </button>
                <button
                  className={`profile-like-pill profile-dislike-pill ${disliked ? "disliked" : ""}`}
                  onClick={() => rate("dislike")}
                  disabled={likeBusy || p.isOwner}
                  title={p.isOwner ? "Dislikes" : disliked ? "Remove dislike" : "Dislike this profile"}
                >
                  <svg viewBox="0 0 24 24" fill={disliked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                    <path d="M17 14V2M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z" />
                  </svg>
                  {dislikeCount.toLocaleString()}
                </button>
              </div>
              <div className="profile-joined">
                Joined {p.createdAt}
                {!p.isOwner && (
                  <>
                    <span className="profile-joined-sep">·</span>
                    <button type="button" className="profile-report-link" onClick={() => setReportOpen(true)}>⚑ Report</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {entered && (
          <div className="profile-social">
            {p.projects.length > 0 && effectiveLayout !== "social" && <ProfileProjects projects={p.projects} />}
            <ProfileComments slug={p.username} viewerLoggedIn={p.viewerLoggedIn} />
          </div>
        )}

        {reportOpen && <ReportProfileModal slug={p.username} onClose={() => setReportOpen(false)} />}

        {!p.isPremium && (
          <div className="profile-footer">
            <Link href="/">⬡ INFECTED.WTF</Link>
          </div>
        )}
      </div>
    </div>
  );
}
