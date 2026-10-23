"use client";

import { SpotifyIcon } from "@/components/IntegrationIcons";

type SpotifyTrack = {
  trackName: string;
  artists: string;
  albumImage: string;
  playedAt: string;
  trackUrl: string;
};

export type SpotifyNowPlaying = {
  isPlaying: boolean;
  trackName: string;
  artists: string;
  albumName: string;
  albumImage: string;
  trackUrl: string;
  progressMs: number;
  durationMs: number;
  syncedAt?: number;
};

type SpotifyTopTrack = {
  trackName: string;
  artists: string;
  albumImage: string;
  trackUrl: string;
};

type SpotifyData = {
  spotifyUserId: string;
  displayName: string;
  profileUrl: string;
  avatarUrl: string;
  nowPlaying: SpotifyNowPlaying | null;
  recentTracks: SpotifyTrack[];
  topTracks: SpotifyTopTrack[];
  lastSyncAt: string;
};

function fmt(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Purely presentational — the live track + elapsed-progress ticking lives one
 * level up (`useSpotifyLive` in ProfileImmersive) so it survives this card
 * being unmounted/remounted as the viewer switches tabs (Home shows a compact
 * card, Widgets shows the full one — two separate mounts of this component
 * that must still reflect the *same* live state, not each poll from scratch).
 * `compact`: just the current (or last played) track, for the profile home; the full card shows top/recent lists.
 */
export default function SpotifyPresenceCard({
  data, nowPlaying, progress, compact = false,
}: {
  data: SpotifyData;
  nowPlaying: SpotifyNowPlaying | null;
  progress: number;
  slug: string;
  compact?: boolean;
}) {
  const max = nowPlaying?.durationMs || 0;
  const pct = max ? Math.max(0, Math.min(100, (progress / max) * 100)) : 0;

  if (compact) {
    const last = !nowPlaying ? data.recentTracks[0] : null;
    if (!nowPlaying && !last) return null;
    const track = nowPlaying
      ? { name: nowPlaying.trackName, artists: nowPlaying.artists, image: nowPlaying.albumImage, url: nowPlaying.trackUrl }
      : { name: last!.trackName, artists: last!.artists, image: last!.albumImage, url: last!.trackUrl };
    return (
      <a className="sp-compact" href={track.url || data.profileUrl || "https://open.spotify.com"} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={track.image || data.avatarUrl || "/assets/img/default-avatar.png"} alt="" />
        <div className="sp-compact-body">
          <div className="sp-compact-top">
            <b>{track.name}</b>
            <span className={`sp-compact-state ${nowPlaying?.isPlaying ? "live" : ""}`}>
              <SpotifyIcon size={14} />{nowPlaying?.isPlaying ? "Listening" : nowPlaying ? "Paused" : "Last played"}
            </span>
          </div>
          <span className="sp-compact-artist">{track.artists}</span>
          {nowPlaying && max > 0 && (
            <div className="sp-compact-progress">
              <span>{fmt(progress)}</span>
              <div className="sp-progress-track"><span className="sp-progress-fill" style={{ width: `${pct}%` }} /></div>
              <span>{fmt(max)}</span>
            </div>
          )}
        </div>
      </a>
    );
  }

  return (
    <div className="spotify-presence-card">
      <div className="sp-header">
        <div className="sp-title-wrap">
          <div className="sp-spotify-icon"><SpotifyIcon size={16} /></div>
          <div>
            <div className="sp-title">Spotify</div>
            <div className="sp-subtitle">{nowPlaying?.isPlaying ? "Listening now" : "Last activity"}</div>
          </div>
        </div>
        <a href={data.profileUrl || "https://open.spotify.com"} target="_blank" rel="noopener noreferrer" className="sp-open-link">
          Open
        </a>
      </div>

      {nowPlaying ? (
        <div className="sp-now-row">
          <div className="sp-cover-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={nowPlaying.albumImage || data.avatarUrl || "/assets/img/default-avatar.png"} alt="" className="sp-cover" />
            {nowPlaying.isPlaying && <span className="sp-live-dot" />}
          </div>
          <div className="sp-now-info">
            <a href={nowPlaying.trackUrl || data.profileUrl || "#"} target="_blank" rel="noopener noreferrer" className="sp-track-name">
              {nowPlaying.trackName}
            </a>
            <div className="sp-artists">{nowPlaying.artists}</div>
            <div className="sp-album">{nowPlaying.albumName}</div>
            {max > 0 && (
              <>
                <div className="sp-progress-track"><span className="sp-progress-fill" style={{ width: `${pct}%` }} /></div>
                <div className="sp-progress-time">
                  <span>{fmt(progress)}</span>
                  <span>{fmt(max)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="sp-empty">No active playback right now.</div>
      )}

      {data.topTracks.length > 0 && (
        <div className="sp-section">
          <div className="sp-section-label">Most played</div>
          <div className="sp-recent-list">
            {data.topTracks.slice(0, 3).map((track, idx) => (
              <a key={`top-${track.trackName}-${idx}`} href={track.trackUrl || data.profileUrl || "#"} target="_blank" rel="noopener noreferrer" className="sp-recent-item">
                <span className="sp-rank">#{idx + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={track.albumImage || data.avatarUrl || "/assets/img/default-avatar.png"} alt="" className="sp-recent-cover" />
                <div className="sp-recent-info">
                  <div className="sp-recent-name">{track.trackName}</div>
                  <div className="sp-recent-artist">{track.artists}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {data.recentTracks.length > 0 && (
        <div className="sp-section">
          <div className="sp-section-label">Last played</div>
          <div className="sp-recent-list">
            {data.recentTracks.slice(0, 3).map((track, idx) => (
              <a key={`${track.trackName}-${idx}`} href={track.trackUrl || data.profileUrl || "#"} target="_blank" rel="noopener noreferrer" className="sp-recent-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={track.albumImage || data.avatarUrl || "/assets/img/default-avatar.png"} alt="" className="sp-recent-cover" />
                <div className="sp-recent-info">
                  <div className="sp-recent-name">{track.trackName}</div>
                  <div className="sp-recent-artist">{track.artists}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
