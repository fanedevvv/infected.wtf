"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import EffectText from "./EffectText";
import DiscordPresenceCard from "./DiscordPresenceCard";
import DiscordServerCard from "./DiscordServerCard";
import GameIntegrationCards from "./GameIntegrationCards";
import SpotifyPresenceCard, { type SpotifyNowPlaying } from "./SpotifyPresenceCard";
import WeatherWidget from "./WeatherWidget";
import ProfileProjects from "./ProfileProjects";
import ProfileComments from "./ProfileComments";
import { DecorationFrame } from "./DecorationSVGs";
import { PLATFORM_ICON } from "./platform-icons";
import { BADGE_ICON } from "@/lib/badge-icons";
import { openSteamInApp } from "@/lib/app-links";
import type { ProfileViewProps } from "./ProfileView";

type Tab = "home" | "widgets" | "projects";

const TAB_ICON: Record<Tab, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  widgets: <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />,
  projects: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
};

/**
 * Owns the live "now playing" poll + elapsed-time ticking at the top level
 * (ProfileImmersive never unmounts across a tab switch), so the two places
 * SpotifyPresenceCard gets rendered — compact on Home, full on Widgets —
 * share one continuously-updating source instead of each restarting its own
 * poll from the stale page-load snapshot every time the viewer switches tabs.
 */
function useSpotifyLive(initial: SpotifyNowPlaying | null, slug: string, enabled: boolean) {
  const [nowPlaying, setNowPlaying] = useState<SpotifyNowPlaying | null>(initial);
  const [now, setNow] = useState(() => Date.now());
  const [mountSync] = useState(() => Date.now());
  const refetchedFor = useRef<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch(`/api/integrations/spotify/now?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
      const j = await res.json();
      if (j.success) setNowPlaying(j.nowPlaying);
    } catch {}
  }

  useEffect(() => {
    if (!enabled) return;
    const poll = setInterval(refresh, 15_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, enabled]);

  const max = nowPlaying?.durationMs || 0;
  const base = nowPlaying?.progressMs || 0;
  const progress = nowPlaying?.isPlaying && max ? Math.min(max, base + (now - (nowPlaying.syncedAt ?? mountSync))) : base;

  // When the song should have ended, ask again right away instead of waiting for the next poll.
  useEffect(() => {
    if (!enabled || !nowPlaying?.isPlaying || !max || progress < max) return;
    const key = `${nowPlaying.trackUrl}-${nowPlaying.syncedAt}`;
    if (refetchedFor.current === key) return;
    refetchedFor.current = key;
    const id = setTimeout(refresh, 1500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, max, nowPlaying, enabled]);

  return { nowPlaying, progress };
}

/**
 * Full-bleed profile layout (no card): content floats over the background, avatar on the right on desktop
 * and on top on phones, with home / widgets / projects tabs and floating likes, report and comments controls.
 */
export default function ProfileImmersive({
  p, entered, hasActiveAvatarEffect, liked, likeCount, disliked, dislikeCount, likeBusy, onRate, onReport,
}: {
  p: ProfileViewProps;
  entered: boolean;
  hasActiveAvatarEffect: boolean;
  liked: boolean;
  likeCount: number;
  disliked: boolean;
  dislikeCount: number;
  likeBusy: boolean;
  onRate: (action: "like" | "dislike") => void;
  onReport: () => void;
}) {
  const spotify = p.gameIntegrations.find((it) => it.type === "spotify");
  const games = p.gameIntegrations.filter((it) => it.type !== "spotify");
  const hasWidgets = !!(p.discordInt || p.discordServerInt || games.length > 0 || p.weather || spotify);
  const tabs: Tab[] = ["home", ...(hasWidgets ? (["widgets"] as Tab[]) : []), ...(p.projects.length ? (["projects"] as Tab[]) : [])];
  const spotifyLive = useSpotifyLive(spotify?.type === "spotify" ? spotify.data.nowPlaying : null, p.username, spotify?.type === "spotify");
  const [tab, setTab] = useState<Tab>("home");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const hasChampion = p.badges.some((b) => b.id === "champion");
  const totalVotes = likeCount + dislikeCount;
  const ratio = totalVotes ? likeCount / totalVotes : 0.5;

  useEffect(() => {
    if (!commentsOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCommentsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commentsOpen]);

  const meta = [
    p.job && { key: "job", icon: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>, text: p.job },
    p.location && { key: "loc", icon: <><path d="M12 22s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" /><circle cx="12" cy="10" r="2.5" /></>, text: p.location },
    p.age !== null && { key: "age", icon: <><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" /></>, text: `${p.age}` },
  ].filter(Boolean) as { key: string; icon: React.ReactNode; text: string }[];

  return (
    <div className={`im-root ${entered ? "im-entered" : ""}`}>
      <div className="im-views" title="Profile views">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" /></svg>
        {p.views.toLocaleString()}
      </div>
      {p.isOwner && <Link href="/dashboard?page=editor" className="im-edit">✏ Edit</Link>}

      <div className="im-grid">
        {tabs.length > 1 && (
          <nav className="im-sidenav" aria-label="Profile sections">
            <div className="im-sidenav-who">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.avatar ? `/${p.avatar}` : "/assets/img/default-avatar.png"} alt="" />
              <span>{p.username}</span>
            </div>
            {tabs.map((t) => (
              <button key={t} type="button" className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
                <i />{t}
              </button>
            ))}
          </nav>
        )}

        <div className="im-avatar-col">
          <div className={`avatar-wrapper im-avatar avatar-shape-${p.avatarShape}`}>
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
        </div>

        <main className="im-content">
          {tab === "home" && (
            <div className="im-home fade-in">
              {p.banner && <div className="im-banner" style={{ backgroundImage: `url(/${p.banner})` }} />}
              <div className="im-title">
                <h1 className={`im-name ${hasChampion ? "champion-name" : ""}`} id="profile-display-name">
                  <EffectText text={p.displayName} effect={p.nameEffect} active={entered} />
                </h1>
                {p.badges.length > 0 && (
                  <div className="im-badges">
                    {p.badges.map((b) => (
                      <div
                        key={b.id}
                        className={`profile-badge badge-${b.id}`}
                        style={!BADGE_ICON[b.id] && b.color ? { background: `${b.color}22`, border: `1px solid ${b.color}55`, color: b.color } : undefined}
                      >
                        {b.id === "premium" ? (
                          <svg viewBox="0 0 24 24" fill="none"><path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.3)" stroke="#ffd700" strokeWidth="1.8" strokeLinejoin="round" /><path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="#ffd700" strokeWidth="1.4" strokeLinejoin="round" /></svg>
                        ) : (
                          BADGE_ICON[b.id] || <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8" /></svg>
                        )}
                        <span className="badge-tooltip">{b.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="im-underline" />

              {p.bio && (
                <p className="im-bio">
                  <EffectText text={p.bio} effect={p.bioEffect} active={entered} />
                </p>
              )}

              {p.socialLinks.length > 0 && (
                <div className="im-socials">
                  {p.socialLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => openSteamInApp(e, link.url)}
                      title={link.platform[0].toUpperCase() + link.platform.slice(1)}
                    >
                      {PLATFORM_ICON[link.platform] || PLATFORM_ICON.website}
                    </a>
                  ))}
                </div>
              )}

              {(meta.length > 0 || p.createdAt) && (
                <div className="im-meta">
                  {meta.map((m) => (
                    <span key={m.key}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">{m.icon}</svg>
                      {m.text}
                    </span>
                  ))}
                  <span className="im-joined">Joined {p.createdAt}</span>
                </div>
              )}

              {p.skills.length > 0 && (
                <div className="profile-skills im-skills">
                  {p.skills.map((sk) => (
                    <div className="profile-skill" key={sk.id}>
                      <div className="profile-skill-head"><span>{sk.name}</span><span>{sk.level}%</span></div>
                      <div className="profile-skill-bar"><span style={{ width: `${Math.max(2, Math.min(100, sk.level))}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}

              {spotify?.type === "spotify" && (
                <div className="im-block">
                  <SpotifyPresenceCard data={spotify.data} nowPlaying={spotifyLive.nowPlaying} progress={spotifyLive.progress} slug={p.username} compact />
                </div>
              )}

              {/* With a single tab there's no widgets tab, so integrations live on home. */}
              {tabs.length === 1 && hasWidgets && <Widgets p={p} games={games} spotifyLive={spotifyLive} />}
            </div>
          )}

          {tab === "widgets" && <div className="fade-in"><Widgets p={p} games={games} spotifyLive={spotifyLive} /></div>}
          {tab === "projects" && <div className="fade-in im-projects"><ProfileProjects projects={p.projects} /></div>}
        </main>
      </div>

      {p.bestFriend && (
        <Link href={`/${p.bestFriend.slug}`} className="im-bestfriend" title={`Best friend: ${p.bestFriend.displayName}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.bestFriend.avatar ? `/${p.bestFriend.avatar}` : "/assets/img/default-avatar.png"} alt={p.bestFriend.displayName} />
          <span aria-hidden="true">❤</span>
        </Link>
      )}

      <button type="button" className="im-chat" onClick={() => setCommentsOpen(true)} aria-label="Comments">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.4 1.2 4.6 3.1 6.1L4.5 21l3.9-2c1.1.3 2.3.5 3.6.5 5.5 0 10-3.8 10-8.5S17.5 3 12 3z" /></svg>
      </button>

      <div className="im-votes">
        <div className="im-ratio" title={`${likeCount} likes · ${dislikeCount} dislikes`}><span style={{ width: `${ratio * 100}%` }} /></div>
        <div className="im-vote-row">
          <button type="button" className={liked ? "on" : ""} onClick={() => onRate("like")} disabled={likeBusy || p.isOwner} aria-label="Like">
            <svg viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z" /></svg>
            {likeCount.toLocaleString()}
          </button>
          <i />
          <button type="button" className={disliked ? "on" : ""} onClick={() => onRate("dislike")} disabled={likeBusy || p.isOwner} aria-label="Dislike">
            <svg viewBox="0 0 24 24" fill={disliked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M17 14V2M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z" /></svg>
            {dislikeCount.toLocaleString()}
          </button>
        </div>
      </div>

      {!p.isOwner && (
        <button type="button" className="im-flag" onClick={onReport} aria-label="Report profile" title="Report profile">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M5 3v18h2v-7h11l-2-4 2-4H7V3z" /></svg>
        </button>
      )}

      {tabs.length > 1 && (
        <nav className="im-tabbar" aria-label="Profile sections">
          {tabs.map((t) => (
            <button key={t} type="button" className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" width="16" height="16">{TAB_ICON[t]}</svg>
              {t}
            </button>
          ))}
        </nav>
      )}

      {!p.isPremium && <Link href="/" className="im-brand">⬡ INFECTED.WTF</Link>}

      {commentsOpen && (
        <div className="im-drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && setCommentsOpen(false)}>
          <div className="im-drawer" role="dialog" aria-modal="true" aria-label="Comments">
            <button type="button" className="im-drawer-close" onClick={() => setCommentsOpen(false)} aria-label="Close">✕</button>
            <ProfileComments slug={p.username} viewerLoggedIn={p.viewerLoggedIn} />
          </div>
        </div>
      )}
    </div>
  );
}

function Widgets({
  p, games, spotifyLive,
}: {
  p: ProfileViewProps;
  games: ProfileViewProps["gameIntegrations"];
  spotifyLive: { nowPlaying: SpotifyNowPlaying | null; progress: number };
}) {
  const spotify = p.gameIntegrations.find((it) => it.type === "spotify");
  return (
    <div className="im-widgets">
      {p.weather && <WeatherWidget tempC={p.weather.tempC} code={p.weather.code} description={p.weather.description} location={p.weather.location} />}
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
      {spotify?.type === "spotify" && <SpotifyPresenceCard data={spotify.data} nowPlaying={spotifyLive.nowPlaying} progress={spotifyLive.progress} slug={p.username} />}
      {games.length > 0 && <GameIntegrationCards integrations={games} />}
    </div>
  );
}
