"use client";

import { useEffect, useRef, useState } from "react";

export default function MusicPlayer({
  tracks,
  style,
  active,
}: {
  tracks: string[];
  style: string;
  active: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const startedRef = useRef(false);

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
  const trackName = (tracks[index].split("/").pop() || "").replace(/\.[^.]+$/, "");

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
        {tracks.length > 1 && <button className="mp-nav" onClick={prev} title="Previous">{prevIcon}</button>}
        <button className="mp-play" onClick={togglePlay} title={playing ? "Pause" : "Play"}>{playing ? pauseIcon : playIcon}</button>
        {tracks.length > 1 && <button className="mp-nav" onClick={next} title="Next">{nextIcon}</button>}
        {tracks.length > 1 && (
          <div className="mp-dots">
            {tracks.map((_, i) => <span key={i} className={`mp-dot ${i === index ? "active" : ""}`} />)}
          </div>
        )}
      </div>
    );
  }

  if (style === "vinyl") {
    return (
      <div className="music-player music-player--vinyl">
        {audioEl}
        <button className={`mp-vinyl-disc ${playing ? "spinning" : ""}`} onClick={togglePlay} title={playing ? "Pause" : "Play"}>
          <span className="mp-vinyl-hole" />
        </button>
        <div className="mp-vinyl-info">
          <span className="mp-vinyl-track">{trackName}</span>
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
      {tracks.length > 1 && <span className="mp-glow-track">{trackName}</span>}
    </div>
  );
}
