"use client";

import { useEffect, useRef, useState } from "react";
import { SpotifyIcon } from "@/components/IntegrationIcons";

type SpotifyTrack = {
  trackName: string;
  artists: string;
  albumImage: string;
  playedAt: string;
  trackUrl: string;
};

type SpotifyNowPlaying = {
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

const POLL_MS = 15_000;

export default function SpotifyPresenceCard({ data, slug }: { data: SpotifyData; slug: string }) {
  const [nowPlaying, setNowPlaying] = useState<SpotifyNowPlaying | null>(data.nowPlaying);
  // Snapshots from before syncedAt existed are treated as read when the page loaded.
  const [fallbackSync] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const refetchedFor = useRef<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch(`/api/integrations/spotify/now?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
      const j = await res.json();
      if (j.success) setNowPlaying(j.nowPlaying);
    } catch {}
  }

  useEffect(() => {
    const poll = setInterval(refresh, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const max = nowPlaying?.durationMs || 0;
  const base = nowPlaying?.progressMs || 0;
  const progress = nowPlaying?.isPlaying && max ? Math.min(max, base + (now - (nowPlaying.syncedAt ?? fallbackSync))) : base;
  const pct = max ? Math.max(0, Math.min(100, (progress / max) * 100)) : 0;

  // When the song should have ended, ask again right away instead of waiting for the next poll.
  useEffect(() => {
    if (!nowPlaying?.isPlaying || !max || progress < max) return;
    const key = `${nowPlaying.trackUrl}-${nowPlaying.syncedAt}`;
    if (refetchedFor.current === key) return;
    refetchedFor.current = key;
    const id = setTimeout(refresh, 1500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, max, nowPlaying]);

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
