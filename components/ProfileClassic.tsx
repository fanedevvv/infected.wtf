"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import EffectText from "./EffectText";
import DiscordPresenceCard from "./DiscordPresenceCard";
import DiscordServerCard from "./DiscordServerCard";
import GameIntegrationCards from "./GameIntegrationCards";
import SpotifyPresenceCard from "./SpotifyPresenceCard";
import WeatherWidget from "./WeatherWidget";
import ProfileProjects from "./ProfileProjects";
import ProfileComments from "./ProfileComments";
import { DecorationFrame } from "./DecorationSVGs";
import { PLATFORM_ICON } from "./platform-icons";
import { BADGE_ICON } from "@/lib/badge-icons";
import { openSteamInApp } from "@/lib/app-links";
import { profileFontFamily, googleFontsHref } from "@/lib/profile-fonts";
import type { ProfileViewProps } from "./ProfileView";

const PLATFORM_COLOR: Record<string, string> = {
  steam: "#1b2838", spotify: "#1DB954", discord: "#5865F2", instagram: "#E1306C",
  twitter: "#000000", youtube: "#FF0000", twitch: "#9146FF", github: "#333333",
  tiktok: "#010101", website: "#555555",
};

/**
 * The original card-shaped family of layouts (Classic Card, Split, Terminal,
 * Deck, Dock, Orbit, Vinyl — anything that isn't Modern's full-bleed sidebar)
 * — one component, `layout` picks the CSS variant via profile-card--{layout},
 * exactly the grid-template-areas system already in globals.css.
 */
export default function ProfileClassic({
  p, entered, layout, liked, likeCount, disliked, dislikeCount, likeBusy, onRate, onReport,
}: {
  p: ProfileViewProps;
  entered: boolean;
  layout: string;
  liked: boolean;
  likeCount: number;
  disliked: boolean;
  dislikeCount: number;
  likeBusy: boolean;
  onRate: (action: "like" | "dislike") => void;
  onReport: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const spotifyIntegration = p.gameIntegrations.find((it) => it.type === "spotify");
  const gameIntegrationsNoSpotify = p.gameIntegrations.filter((it) => it.type !== "spotify");
  const hasChampion = p.badges.some((b) => b.id === "champion");
  const hasActiveAvatarEffect = !!(p.activeAvatarEffect && p.purchasedEffects.includes(p.activeAvatarEffect));

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
      {fontHref && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={fontHref} />
      )}
      {p.isOwner && (
        <div className="edit-profile-btn">
          <Link href="/dashboard?page=editor" className="btn btn-secondary btn-sm">✏ Edit</Link>
        </div>
      )}

      <div className={`profile-wrapper profile-wrapper--${layout}`}>
        <div className={`profile-card profile-card--${layout}`} ref={cardRef}>
          {p.banner && <div className="profile-banner-img fade-in" style={{ backgroundImage: `url(/${p.banner})` }} />}
          <div className={`avatar-wrapper fade-in avatar-shape-${p.avatarShape} ${p.banner ? "avatar-wrapper--with-banner" : ""}`}>
            {!hasActiveAvatarEffect && p.isPremium && p.avatarRing === "premium" ? (
              <>
                <div className="avatar-ring-pulse" />
                <div className="avatar-ring-shell ring-premium"><div className="avatar-ring-spin" /></div>
              </>
            ) : !hasActiveAvatarEffect && p.avatarRing === "normal" ? (
              <div className="avatar-ring-shell ring-normal"><div className="avatar-ring-spin" /></div>
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
                  <div key={b.id} className="profile-badge badge-premium" style={{ background: "linear-gradient(135deg,rgba(255,215,0,.2),rgba(255,160,0,.12))", border: "1.5px solid rgba(255,215,0,.55)", boxShadow: "0 0 16px rgba(255,215,0,.4)" }}>
                    <svg viewBox="0 0 24 24" fill="none" width="17" height="17" style={{ filter: "drop-shadow(0 0 5px rgba(255,215,0,.9))" }}>
                      <path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.3)" stroke="#ffd700" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="#ffd700" strokeWidth="1.4" strokeLinejoin="round" opacity=".85" />
                    </svg>
                    <span className="badge-tooltip">Infected Plus</span>
                  </div>
                ) : (
                  <div key={b.id} className={`profile-badge badge-${b.id}`} style={!BADGE_ICON[b.id] && b.color ? { background: `${b.color}22`, border: `1px solid ${b.color}55`, color: b.color } : undefined}>
                    {BADGE_ICON[b.id] || <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><circle cx="12" cy="12" r="8" /></svg>}
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
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="#ffffff" style={{ opacity: .6 }}><path d="M12 2C8.686 2 6 4.686 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.314-2.686-6-6-6z" /><circle cx="12" cy="8" r="2.2" fill="rgba(5,5,7,0.55)" /></svg>
                  {p.location}
                </div>
              )}
              {p.job && (
                <div className="profile-location">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#ffffff" strokeWidth="2" style={{ opacity: .6 }}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                  {p.job}
                </div>
              )}
              {p.age !== null && (
                <div className="profile-location">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#ffffff" strokeWidth="2" style={{ opacity: .6 }}><path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>
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
              {p.weather && <WeatherWidget tempC={p.weather.tempC} code={p.weather.code} description={p.weather.description} location={p.weather.location} />}
              {p.discordInt && (
                <DiscordPresenceCard discordUserId={p.discordInt.discordUserId} discordUsername={p.discordInt.discordUsername} discordGlobalName={p.discordInt.discordGlobalName} discordAvatar={p.discordInt.discordAvatar} />
              )}
              {p.discordServerInt && (
                <DiscordServerCard invite={p.discordServerInt.invite} serverName={p.discordServerInt.serverName} serverIcon={p.discordServerInt.serverIcon} serverId={p.discordServerInt.serverId} online={p.discordServerInt.online} total={p.discordServerInt.total} />
              )}
              {spotifyIntegration?.type === "spotify" && (
                <SpotifyPresenceCard data={spotifyIntegration.data} nowPlaying={spotifyIntegration.data.nowPlaying} progress={spotifyIntegration.data.nowPlaying?.progressMs || 0} slug={p.username} />
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
              <button className={`profile-like-pill ${liked ? "liked" : ""}`} onClick={() => onRate("like")} disabled={likeBusy || p.isOwner} title={p.isOwner ? "Likes" : liked ? "Remove like" : "Like this profile"}>
                <svg viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z" /></svg>
                {likeCount.toLocaleString()}
              </button>
              <button className={`profile-like-pill profile-dislike-pill ${disliked ? "disliked" : ""}`} onClick={() => onRate("dislike")} disabled={likeBusy || p.isOwner} title={p.isOwner ? "Dislikes" : disliked ? "Remove dislike" : "Dislike this profile"}>
                <svg viewBox="0 0 24 24" fill={disliked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M17 14V2M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z" /></svg>
                {dislikeCount.toLocaleString()}
              </button>
            </div>
            <div className="profile-joined">
              Joined {p.createdAt}
              {!p.isOwner && (
                <>
                  <span className="profile-joined-sep">·</span>
                  <button type="button" className="profile-report-link" onClick={onReport}>⚑ Report</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {entered && (
        <div className="profile-social">
          {p.projects.length > 0 && <ProfileProjects projects={p.projects} />}
          <ProfileComments slug={p.username} viewerLoggedIn={p.viewerLoggedIn} />
        </div>
      )}
    </div>
  );
}
