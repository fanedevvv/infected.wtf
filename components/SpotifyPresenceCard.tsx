"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function SpotifyPresenceCard({ data }: { data: SpotifyData }) {
  const base = data.nowPlaying?.progressMs || 0;
  const max = data.nowPlaying?.durationMs || 0;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!data.nowPlaying?.isPlaying || !max) return;
    const t = setInterval(() => {
      setTick((v) => v + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [data.nowPlaying?.isPlaying, max]);

  const progress = useMemo(() => {
    if (!data.nowPlaying) return base;
    if (!data.nowPlaying.isPlaying || !max) return base;
    return Math.min(max, base + tick * 1000);
  }, [base, data.nowPlaying, max, tick]);

  const pct = useMemo(() => {
    if (!max) return 0;
    return Math.max(0, Math.min(100, (progress / max) * 100));
  }, [progress, max]);

  return (
    <div className="spotify-presence-card">
      <div className="sp-header">
        <div className="sp-title-wrap">
          <div className="sp-spotify-icon"><SpotifyIcon size={16} /></div>
          <div>
            <div className="sp-title">Spotify</div>
            <div className="sp-subtitle">{data.nowPlaying?.isPlaying ? "Listening now" : "Last activity"}</div>
          </div>
        </div>
        <a href={data.profileUrl || "https://open.spotify.com"} target="_blank" rel="noopener noreferrer" className="sp-open-link">
          Open
        </a>
      </div>

      {data.nowPlaying ? (
        <div className="sp-now-row">
          <div className="sp-cover-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.nowPlaying.albumImage || data.avatarUrl || "/assets/img/default-avatar.png"} alt="" className="sp-cover" />
            {data.nowPlaying.isPlaying && <span className="sp-live-dot" />}
          </div>
          <div className="sp-now-info">
            <a href={data.nowPlaying.trackUrl || data.profileUrl || "#"} target="_blank" rel="noopener noreferrer" className="sp-track-name">
              {data.nowPlaying.trackName}
            </a>
            <div className="sp-artists">{data.nowPlaying.artists}</div>
            <div className="sp-album">{data.nowPlaying.albumName}</div>
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
