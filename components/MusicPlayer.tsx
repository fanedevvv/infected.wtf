"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type LyricLine = { time: number; text: string };

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split("\n")) {
    const match = raw.match(/^\[(\d{2}):(\d{2})(?:[.:](\d{1,3}))?\](.*)$/);
    if (!match) continue;
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const frac = match[3] ? parseFloat(`0.${match[3]}`) : 0;
    const text = match[4].trim();
    if (text) lines.push({ time: minutes * 60 + seconds + frac, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

export default function MusicPlayer({
  tracks,
  style,
  active,
  artworkUrl,
  trackTitle,
  trackArtist,
  lyricsSynced,
  showLyrics,
}: {
  tracks: string[];
  style: string;
  active: boolean;
  artworkUrl?: string | null;
  trackTitle?: string | null;
  trackArtist?: string | null;
  lyricsSynced?: string | null;
  showLyrics?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [muted, setMuted] = useState(false);
  const [lyricIdx, setLyricIdx] = useState(-1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const startedRef = useRef(false);

  const lyricLines = useMemo(() => (lyricsSynced ? parseLrc(lyricsSynced) : []), [lyricsSynced]);
  const lyricsActive = !!(showLyrics && lyricLines.length > 0 && index === 0);

  useEffect(() => {
    if (!lyricsActive || !audioRef.current) return;
    const el = audioRef.current;
    const onTimeUpdate = () => {
      const t = el.currentTime;
      let i = -1;
      for (let n = 0; n < lyricLines.length; n++) {
        if (lyricLines[n].time <= t) i = n;
        else break;
      }
      setLyricIdx(i);
    };
    el.addEventListener("timeupdate", onTimeUpdate);
    return () => el.removeEventListener("timeupdate", onTimeUpdate);
  }, [lyricsActive, lyricLines]);

  useEffect(() => {
    if (active && !startedRef.current && audioRef.current) {
      startedRef.current = true;
      audioRef.current.volume = volume;
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  function next() {
    setIndex((i) => (i + 1) % tracks.length);
    setPlaying(true);
  }
  function prev() {
    setIndex((i) => (i - 1 + tracks.length) % tracks.length);
    setPlaying(true);
  }
  function onEnded() {
    if (tracks.length > 1) next();
    else if (audioRef.current) audioRef.current.play().catch(() => {});
  }

  useEffect(() => {
    if (playing && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [index, playing]);

  function onVolumeChange(v: number) {
    setVolume(v);
    setMuted(v === 0);
    if (audioRef.current) audioRef.current.volume = v;
  }
  function toggleMute() {
    if (!audioRef.current) return;
    if (muted) {
      audioRef.current.volume = volume || 0.35;
      setMuted(false);
    } else {
      audioRef.current.volume = 0;
      setMuted(true);
    }
  }

  if (tracks.length === 0) return null;
  const hasMeta = index === 0 && !!trackTitle;
  const trackName = hasMeta ? `${trackTitle}${trackArtist ? ` · ${trackArtist}` : ""}` : (tracks[index].split("/").pop() || "").replace(/\.[^.]+$/, "");
  const showArtwork = index === 0 && !!artworkUrl;
  const currentLyric = lyricsActive ? lyricLines[lyricIdx]?.text : null;

  const playIcon = (
    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M8 5v14l11-7z" /></svg>
  );
  const pauseIcon = (
    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
  );
  const prevIcon = (
    <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M6 6h2v12H6zM20 6v12l-8.5-6z" /></svg>
  );
  const nextIcon = (
    <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M16 6h2v12h-2zM4 6v12l8.5-6z" /></svg>
  );
  const muteIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
  );
  const volIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
  );

  const audioEl = <audio ref={audioRef} src={`/${tracks[index]}`} preload="auto" onEnded={onEnded} />;

  if (style === "compact") {
    return (
      <div className="music-player music-player--compact">
        {audioEl}
        {showArtwork && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artworkUrl!} alt="" className="mp-artwork mp-artwork--compact" />
        )}
        {tracks.length > 1 && <button className="mp-nav" onClick={prev} title="Previous">{prevIcon}</button>}
        <button className="mp-play" onClick={togglePlay} title={playing ? "Pause" : "Play"}>{playing ? pauseIcon : playIcon}</button>
        {tracks.length > 1 && <button className="mp-nav" onClick={next} title="Next">{nextIcon}</button>}
        {tracks.length > 1 && (
          <div className="mp-dots">
            {tracks.map((_, i) => <span key={i} className={`mp-dot ${i === index ? "active" : ""}`} />)}
          </div>
        )}
        {currentLyric && <span className="mp-lyric mp-lyric--compact">{currentLyric}</span>}
      </div>
    );
  }

  if (style === "vinyl") {
    return (
      <div className="music-player music-player--vinyl">
        {audioEl}
        <button className={`mp-vinyl-disc ${playing ? "spinning" : ""}`} onClick={togglePlay} title={playing ? "Pause" : "Play"}>
          {showArtwork ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artworkUrl!} alt="" className="mp-vinyl-art" />
          ) : null}
          <span className="mp-vinyl-hole" />
        </button>
        <div className="mp-vinyl-info">
          <span className="mp-vinyl-track">{trackName}</span>
          {currentLyric && <span className="mp-lyric mp-lyric--vinyl">{currentLyric}</span>}
          {tracks.length > 1 && (
            <div className="mp-vinyl-controls">
              <button className="mp-nav" onClick={prev} title="Previous">{prevIcon}</button>
              <button className="mp-nav" onClick={next} title="Next">{nextIcon}</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // glow (default)
  return (
    <div className="music-player music-player--glow">
      {audioEl}
      <div className="mp-glow-row">
        {showArtwork && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artworkUrl!} alt="" className="mp-artwork mp-artwork--glow" />
        )}
        {tracks.length > 1 && <button className="mp-nav" onClick={prev} title="Previous">{prevIcon}</button>}
        <button className="mp-play" onClick={togglePlay} title={playing ? "Pause" : "Play"}>{playing ? pauseIcon : playIcon}</button>
        {tracks.length > 1 && <button className="mp-nav" onClick={next} title="Next">{nextIcon}</button>}
        <button className="mp-nav" onClick={toggleMute} title="Mute / Unmute">{muted ? muteIcon : volIcon}</button>
        <input
          type="range"
          className="vol-slider"
          min={0} max={1} step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        />
      </div>
      {(tracks.length > 1 || hasMeta) && <span className="mp-glow-track">{trackName}</span>}
      {currentLyric && <span className="mp-lyric mp-lyric--glow">{currentLyric}</span>}
    </div>
  );
}
