"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "@/lib/toast";

const FONTS = ["Syne", "Outfit", "Space Mono", "Rajdhani", "Orbitron", "Bebas Neue", "Exo 2", "Josefin Sans"];
const LAYOUT_TEMPLATES = ["classic", "editorial", "terminal", "banner", "compact", "aurora", "cinematic", "dossier"] as const;
const PREMIUM_LAYOUT_TEMPLATES = ["aurora", "cinematic", "dossier"] as const;

type Props = {
  tab: string;
  sub: string;
  avatar: string | null;
  banner: string | null;
  backgroundType: string;
  backgroundValue: string;
  musicTracks: (string | null)[];
  playlistStyle: string;
  layoutTemplate: string;
  isPremium: boolean;
  cursorPath: string | null;
  displayName: string;
  location: string;
  job: string;
  birthDate: string;
  bio: string;
  profileFont: string;
  profileOpacity: number;
  profileBlur: number;
  accentColor: string;
  backgroundColor: string;
  nameColor: string;
  bioColor: string;
  overlayColor: string;
};

export default function ProfileInfoForm(props: Props) {
  const [avatar, setAvatar] = useState(props.avatar);
  const [banner, setBanner] = useState(props.banner);
  const [bgType, setBgType] = useState(props.backgroundType);
  const [bgValue, setBgValue] = useState(props.backgroundValue);
  const [musicTracks, setMusicTracks] = useState<(string | null)[]>(props.musicTracks);
  const [playlistStyle, setPlaylistStyle] = useState(props.playlistStyle);
  const [layoutTemplate, setLayoutTemplate] = useState(props.layoutTemplate);
  const [cursorPath, setCursorPath] = useState(props.cursorPath);

  const [displayName, setDisplayName] = useState(props.displayName);
  const [location, setLocation] = useState(props.location);
  const [job, setJob] = useState(props.job);
  const [birthDate, setBirthDate] = useState(props.birthDate);
  const [bio, setBio] = useState(props.bio);
  const [font, setFont] = useState(props.profileFont);
  const [opacity, setOpacity] = useState(props.profileOpacity);
  const [blur, setBlur] = useState(props.profileBlur);
  const [accentColor, setAccentColor] = useState(props.accentColor);
  const [backgroundColor, setBackgroundColor] = useState(props.backgroundColor);
  const [nameColor, setNameColor] = useState(props.nameColor);
  const [bioColor, setBioColor] = useState(props.bioColor);
  const [overlayColor, setOverlayColor] = useState(props.overlayColor);

  const original = useRef({
    displayName: props.displayName,
    location: props.location,
    job: props.job,
    birthDate: props.birthDate,
    bio: props.bio,
    font: props.profileFont,
    playlistStyle: props.playlistStyle,
    layoutTemplate: props.layoutTemplate,
    opacity: props.profileOpacity,
    blur: props.profileBlur,
    accentColor: props.accentColor,
    backgroundColor: props.backgroundColor,
    nameColor: props.nameColor,
    bioColor: props.bioColor,
    overlayColor: props.overlayColor,
  });

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  const [musicUploading, setMusicUploading] = useState<number | null>(null);
  const [cursorUploading, setCursorUploading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const musicInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const cursorInputRef = useRef<HTMLInputElement>(null);
  const fontWrapRef = useRef<HTMLDivElement>(null);

  function checkDirty(next?: Partial<typeof original.current>) {
    const cur = {
      displayName,
      location,
      job,
      birthDate,
      bio,
      font,
      playlistStyle,
      layoutTemplate,
      opacity,
      blur,
      accentColor,
      backgroundColor,
      nameColor,
      bioColor,
      overlayColor,
      ...next,
    };
    const o = original.current;
    const isDirty =
      cur.displayName !== o.displayName ||
      cur.location !== o.location ||
      cur.job !== o.job ||
      cur.birthDate !== o.birthDate ||
      cur.bio !== o.bio ||
      cur.font !== o.font ||
      cur.playlistStyle !== o.playlistStyle ||
      cur.layoutTemplate !== o.layoutTemplate ||
      cur.opacity !== o.opacity ||
      cur.accentColor !== o.accentColor ||
      cur.backgroundColor !== o.backgroundColor ||
      cur.nameColor !== o.nameColor ||
      cur.bioColor !== o.bioColor ||
      cur.overlayColor !== o.overlayColor ||
      cur.blur !== o.blur;
    setDirty(isDirty);
  }

  useEffect(() => {
    checkDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName, location, job, birthDate, bio, font, playlistStyle, layoutTemplate, opacity, blur, accentColor, backgroundColor, nameColor, bioColor, overlayColor]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (fontWrapRef.current && !fontWrapRef.current.contains(e.target as Node)) setFontOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Max 5MB", "error");
      return;
    }
    setAvatarUploading(true);
    const fd = new FormData();
    fd.append("avatar", file);
    fd.append("type", "avatar");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (j.success) {
        setAvatar(j.path);
        showToast("Avatar updated!", "success");
      } else {
        showToast(j.error || "Upload failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function clearAvatar() {
    try {
      const fd = new FormData();
      fd.append("action", "clear_avatar");
      const r = await fetch("/api/update_profile", { method: "POST", body: fd });
      const j = await r.json();
      if (j.success) {
        setAvatar(null);
        showToast("Avatar removed!", "success");
      } else showToast(j.error || "Error", "error");
    } catch {
      showToast("Delete error", "error");
    }
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      showToast("Max 8MB", "error");
      return;
    }
    setBannerUploading(true);
    const fd = new FormData();
    fd.append("banner", file);
    fd.append("type", "banner");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (j.success) {
        setBanner(j.path);
        showToast("Banner updated!", "success");
      } else {
        showToast(j.error || "Upload failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setBannerUploading(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  }

  async function clearBanner() {
    try {
      const fd = new FormData();
      fd.append("action", "clear_banner");
      const r = await fetch("/api/update_profile", { method: "POST", body: fd });
      const j = await r.json();
      if (j.success) {
        setBanner(null);
        showToast("Banner removed!", "success");
      } else showToast(j.error || "Error", "error");
    } catch {
      showToast("Delete error", "error");
    }
  }

  async function handleBgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      showToast("Max 100MB", "error");
      return;
    }
    setBgUploading(true);
    const fd = new FormData();
    fd.append("background", file);
    fd.append("type", "background");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (j.success) {
        setBgType(file.type === "video/mp4" || file.type === "video/webm" ? "video" : "image");
        setBgValue(j.path);
        showToast("Background updated!", "success");
      } else {
        showToast(j.error || "Upload failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setBgUploading(false);
      if (bgInputRef.current) bgInputRef.current.value = "";
    }
  }

  async function clearBackground() {
    try {
      const fd = new FormData();
      fd.append("action", "clear_background");
      const r = await fetch("/api/update_profile", { method: "POST", body: fd });
      const j = await r.json();
      if (j.success) {
        setBgType("particles");
        setBgValue("#050507");
        showToast("Background removed!", "success");
      } else showToast(j.error || "Error", "error");
    } catch {
      showToast("Delete error", "error");
    }
  }

  async function handleMusicChange(slot: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      showToast("Max 20MB for audio files.", "error");
      return;
    }
    setMusicUploading(slot);
    const fd = new FormData();
    fd.append("music", file);
    fd.append("type", "music");
    fd.append("slot", String(slot));
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (j.success) {
        setMusicTracks((t) => { const n = [...t]; n[slot - 1] = j.path; return n; });
        showToast("Track uploaded!", "success");
      } else {
        showToast(j.error || "Upload failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setMusicUploading(null);
      const ref = musicInputRefs[slot - 1].current;
      if (ref) ref.value = "";
    }
  }

  async function deleteMusicTrack(slot: number) {
    try {
      const fd = new FormData();
      fd.append("action", "delete_music_track");
      fd.append("slot", String(slot));
      const r = await fetch("/api/update_profile", { method: "POST", body: fd });
      const j = await r.json();
      if (j.success) {
        setMusicTracks((t) => { const n = [...t]; n[slot - 1] = null; return n; });
        showToast("Track removed!", "success");
      } else showToast(j.error || "Error", "error");
    } catch {
      showToast("Delete error", "error");
    }
  }

  async function selectPlaylistStyle(style: string) {
    setPlaylistStyle(style);
  }

  async function selectLayoutTemplate(tpl: string) {
    if (PREMIUM_LAYOUT_TEMPLATES.includes(tpl as (typeof PREMIUM_LAYOUT_TEMPLATES)[number]) && !props.isPremium) {
      showToast("This layout is a Premium feature.", "error");
      return;
    }
    if (!LAYOUT_TEMPLATES.includes(tpl as (typeof LAYOUT_TEMPLATES)[number])) {
      showToast("Invalid layout.", "error");
      return;
    }
    setLayoutTemplate(tpl);
  }

  async function handleCursorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("Max 2MB for cursor.", "error");
      return;
    }
    setCursorUploading(true);
    const fd = new FormData();
    fd.append("cursor", file);
    fd.append("type", "cursor");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (j.success) {
        setCursorPath(j.path);
        showToast("Cursor uploaded!", "success");
      } else {
        showToast(j.error || "Upload failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setCursorUploading(false);
      if (cursorInputRef.current) cursorInputRef.current.value = "";
    }
  }

  async function deleteCursor() {
    try {
      const fd = new FormData();
      fd.append("action", "delete_cursor");
      const r = await fetch("/api/update_profile", { method: "POST", body: fd });
      const j = await r.json();
      if (j.success) {
        setCursorPath(null);
        showToast("Cursor removed!", "success");
      } else showToast(j.error || "Error", "error");
    } catch {
      showToast("Delete error", "error");
    }
  }

  async function save() {
    setSaving(true);
    const fd = new FormData();
    fd.append("action", "profile-info-form");
    fd.append("display_name", displayName);
    fd.append("location", location);
    fd.append("job", job);
    fd.append("birth_date", birthDate);
    fd.append("bio", bio);
    fd.append("profile_font", font);
    fd.append("playlist_style", playlistStyle);
    fd.append("layout_template", layoutTemplate);
    fd.append("avatar", avatar || "");
    fd.append("background_image", bgType === "image" ? bgValue : "");
    fd.append("profile_opacity", String(opacity));
    fd.append("profile_blur", String(blur));
    fd.append("accent_color", accentColor);
    fd.append("background_color", backgroundColor);
    fd.append("name_color", nameColor);
    fd.append("bio_color", bioColor);
    fd.append("overlay_color", overlayColor);
    try {
      const res = await fetch("/api/update_profile", { method: "POST", body: fd });
      const j = await res.json();
      if (j.success) {
        showToast("Profile saved!", "success");
        original.current = { displayName, location, job, birthDate, bio, font, playlistStyle, layoutTemplate, opacity, blur, accentColor, backgroundColor, nameColor, bioColor, overlayColor };
        checkDirty();
      } else {
        showToast(j.error || "Error", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    const o = original.current;
    setDisplayName(o.displayName);
    setLocation(o.location);
    setJob(o.job);
    setBirthDate(o.birthDate);
    setBio(o.bio);
    setFont(o.font);
    setPlaylistStyle(o.playlistStyle);
    setLayoutTemplate(o.layoutTemplate);
    setOpacity(o.opacity);
    setBlur(o.blur);
    setAccentColor(o.accentColor);
    setBackgroundColor(o.backgroundColor);
    setNameColor(o.nameColor);
    setBioColor(o.bioColor);
    setOverlayColor(o.overlayColor);
  }

  return (
    <>
      {props.tab === "media" && props.sub === "visuals" && (
        <div className="dash-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: ".25rem" }}>Visuals</h3>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>Avatar, background and banner</p>
          <div className="visuals-grid">
            <div className="visuals-col">
              <label className="visuals-label">Avatar</label>
              <div className="upload-card upload-card--plain">
                {avatar && <button type="button" className="upload-clear-btn" onClick={clearAvatar} title="Remove avatar">✕</button>}
                <div className="upload-zone upload-zone--square" onClick={() => avatarInputRef.current?.click()}>
                  {avatar ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/${avatar}`} className="upload-preview-img" onError={(e) => { (e.target as HTMLImageElement).src = "/assets/img/default-avatar.png"; }} alt="" />
                      <span className="upload-badge">IMG</span>
                    </>
                  ) : (
                    <div className="upload-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="30" height="30"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      <span>{avatarUploading ? "Uploading…" : "Upload avatar"}</span>
                      <span className="upload-hint">jpg · png · gif · 10MB</span>
                    </div>
                  )}
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
              </div>
            </div>

            <div className="visuals-col">
              <label className="visuals-label">Background</label>
              <div className="upload-card upload-card--plain">
                {["image", "video"].includes(bgType) && bgValue && <button type="button" className="upload-clear-btn" onClick={clearBackground} title="Remove background">✕</button>}
                <div className="upload-zone upload-zone--wide" onClick={() => bgInputRef.current?.click()}>
                  {bgType === "image" && bgValue ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/${bgValue}`} className="upload-preview-img" alt="" />
                      <span className="upload-badge">IMG</span>
                    </>
                  ) : bgType === "video" && bgValue ? (
                    <>
                      <video className="upload-preview-img" autoPlay muted loop playsInline style={{ display: "block", background: "#000" }}>
                        <source src={`/${bgValue}`} />
                      </video>
                      <span className="upload-badge">MP4</span>
                    </>
                  ) : (
                    <div className="upload-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="30" height="30"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                      <span>{bgUploading ? "Uploading…" : "Upload background"}</span>
                      <span className="upload-hint">img · mp4 · webm · 100MB</span>
                    </div>
                  )}
                </div>
                <input ref={bgInputRef} type="file" accept="image/*,video/mp4,video/webm" style={{ display: "none" }} onChange={handleBgChange} />
              </div>

              <label className="visuals-label" style={{ marginTop: "1.1rem" }}>Banner</label>
              <div className="upload-card upload-card--plain">
                {banner && <button type="button" className="upload-clear-btn" onClick={clearBanner} title="Remove banner">✕</button>}
                <div className="upload-zone upload-zone--wide" onClick={() => bannerInputRef.current?.click()}>
                  {banner ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/${banner}`} className="upload-preview-img" alt="" />
                      <span className="upload-badge">IMG</span>
                    </>
                  ) : (
                    <div className="upload-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="30" height="30"><rect x="3" y="3" width="18" height="12" rx="2" /><path d="M3 11l4-3 5 4 5-3 4 3" /></svg>
                      <span>{bannerUploading ? "Uploading…" : "Upload banner"}</span>
                      <span className="upload-hint">jpg · png · webp · 10MB</span>
                    </div>
                  )}
                </div>
                <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleBannerChange} />
              </div>
            </div>
          </div>
        </div>
      )}

      {props.tab === "media" && props.sub === "audio" && (
        <div className="dash-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: ".25rem" }}>Audio &amp; Cursor</h3>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>Background music, playlist tracks and custom cursor</p>

          <div className="form-group" style={{ marginBottom: "1.25rem" }}>
            <label>Playlist Style</label>
            <div className="playlist-style-grid">
              {[
                { id: "glow", label: "Glow" },
                { id: "compact", label: "Compact" },
                { id: "vinyl", label: "Vinyl" },
              ].map((s) => (
                <button key={s.id} type="button" className={`playlist-style-card ${playlistStyle === s.id ? "active" : ""}`} onClick={() => selectPlaylistStyle(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="upload-cards-grid">
            {[1].map((slot) => {
              const trackPath = musicTracks[slot - 1];
              return (
                <div className="upload-card" key={slot}>
                  <div className="upload-card-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                    <div><div className="upload-card-title">Profile Track</div><div className="upload-card-sub">Plays on your profile</div></div>
                    {trackPath && <button type="button" className="upload-clear-btn" onClick={() => deleteMusicTrack(slot)} title="Remove track">✕</button>}
                  </div>
                  <div className="upload-zone" style={{ cursor: "pointer" }} onClick={() => musicInputRefs[slot - 1].current?.click()}>
                    {trackPath ? (
                      <div className="upload-placeholder">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36" style={{ color: "var(--accent)", opacity: 0.7 }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                        <span style={{ fontSize: ".72rem", wordBreak: "break-all", textAlign: "center", padding: "0 .5rem" }}>{trackPath.split("/").pop()}</span>
                        <span className="upload-badge" style={{ position: "static", marginTop: ".25rem" }}>MP3</span>
                      </div>
                    ) : (
                      <div className="upload-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                        <span>{musicUploading === slot ? "Uploading…" : "Click to upload"}</span>
                      </div>
                    )}
                  </div>
                  <input ref={musicInputRefs[slot - 1]} type="file" accept="audio/mpeg,audio/ogg,audio/wav,.mp3,.ogg,.wav" style={{ display: "none" }} onChange={(e) => handleMusicChange(slot, e)} />
                </div>
              );
            })}
          </div>

          <div className="form-group" style={{ marginTop: "1.25rem", maxWidth: 320 }}>
            <label>Custom Cursor</label>
            <div className="upload-card">
              <div className="upload-card-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M4 4l7.07 17 2.51-7.39L21 11.07z" /></svg>
                <div><div className="upload-card-title">Custom Cursor</div><div className="upload-card-sub">Upload a profile cursor</div></div>
                {cursorPath && <button type="button" className="upload-clear-btn" onClick={deleteCursor} title="Remove cursor">✕</button>}
              </div>
              <div className="upload-zone" style={{ cursor: "pointer" }} onClick={() => cursorInputRef.current?.click()}>
                {cursorPath ? (
                  <div className="upload-placeholder">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/${cursorPath}`} style={{ width: 42, height: 42, objectFit: "contain", opacity: 0.8 }} alt="cursor preview" />
                    <span style={{ fontSize: ".72rem", wordBreak: "break-all", textAlign: "center", padding: "0 .5rem" }}>{cursorPath.split("/").pop()}</span>
                    <span className="upload-badge" style={{ position: "static", marginTop: ".25rem" }}>WEBP</span>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36"><path d="M4 4l7.07 17 2.51-7.39L21 11.07z" /></svg>
                    <span>{cursorUploading ? "Uploading…" : "Click to upload"}</span>
                  </div>
                )}
              </div>
              <input ref={cursorInputRef} type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.cur" style={{ display: "none" }} onChange={handleCursorChange} />
            </div>
          </div>
        </div>
      )}

      {props.tab === "appearance" && props.sub === "profile" && (
        <div className="dash-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: ".25rem" }}>Profile Details</h3>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>Your public identity</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Display name</label>
              <input type="text" className="form-control" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter your display name" maxLength={100} />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input type="text" className="form-control" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where are you from?" maxLength={100} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Job / Occupation</label>
              <input type="text" className="form-control" value={job} onChange={(e) => setJob(e.target.value)} placeholder="What do you do?" maxLength={100} />
            </div>
            <div className="form-group">
              <label>Birth date</label>
              <input type="date" className="form-control" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
            </div>
          </div>
          <div className="form-group">
            <label>Bio</label>
            <textarea className="form-control" maxLength={300} placeholder="Tell people about yourself..." value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
        </div>
      )}

      {props.tab === "appearance" && props.sub === "colors" && (
        <div className="dash-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: ".25rem" }}>Colors</h3>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>Define your palette</p>
          <div className="palette-grid-lg">
            {[
              { label: "Accent", value: accentColor, set: setAccentColor },
              { label: "Background", value: backgroundColor, set: setBackgroundColor },
              { label: "Name", value: nameColor, set: setNameColor },
              { label: "Bio", value: bioColor, set: setBioColor },
              { label: "Overlay", value: overlayColor, set: setOverlayColor },
            ].map((c) => (
              <div className="palette-swatch-lg" key={c.label}>
                <label className="palette-swatch-box" style={{ background: c.value }}>
                  <input type="color" value={c.value} onChange={(e) => c.set(e.target.value)} />
                </label>
                <span className="palette-swatch-lg-label">{c.label}</span>
                <input
                  type="text"
                  className="form-control palette-hex-input"
                  value={c.value}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) c.set(v);
                  }}
                  maxLength={7}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {props.tab === "appearance" && props.sub === "fonts" && (
        <div className="dash-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: ".25rem" }}>Typography</h3>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>Font selection</p>
          <div className="font-radio-list">
            {FONTS.map((f) => (
              <div key={f} className={`font-radio-row ${f === font ? "active" : ""}`} onClick={() => setFont(f)}>
                <span style={{ fontFamily: `'${f}', sans-serif` }}>{f}</span>
                <span className={`font-radio-dot ${f === font ? "checked" : ""}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {props.tab === "appearance" && props.sub === "bg" && (
        <div className="dash-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: ".25rem" }}>Background</h3>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>Opacity and blur of your profile card</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 0 20" /></svg>
                Profile Opacity
                <span style={{ marginLeft: "auto", color: "var(--accent)", fontWeight: 700, letterSpacing: 0 }}>{opacity}%</span>
              </label>
              <input type="range" min={0} max={100} value={opacity} onChange={(e) => setOpacity(parseInt(e.target.value, 10))} style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
              <p style={{ fontSize: ".72rem", color: "var(--text-muted)", marginTop: ".4rem" }}>Controls the transparency of your profile card (0% = fully transparent, 100% = fully opaque)</p>
            </div>
            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg>
                Profile Blur
                <span style={{ marginLeft: "auto", color: "var(--accent)", fontWeight: 700, letterSpacing: 0 }}>{blur}px</span>
              </label>
              <input type="range" min={0} max={100} value={blur} onChange={(e) => setBlur(parseInt(e.target.value, 10))} style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
              <p style={{ fontSize: ".72rem", color: "var(--text-muted)", marginTop: ".4rem" }}>Adds a backdrop blur effect to your profile card (0px = no blur, 100px = maximum blur)</p>
            </div>
          </div>
        </div>
      )}

      {props.tab === "layout" && props.sub === "template" && (
        <div className="dash-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: ".25rem" }}>Template</h3>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>Choose your profile layout</p>
          <div className="template-card-grid">
            {[
              { id: "classic", label: "Classic", premium: false, desc: "Avatar and name perfectly centered — the clean baseline.", features: ["Centered design", "Mobile optimized", "Clean & minimal"] },
              { id: "editorial", label: "Editorial", premium: false, desc: "A two-column layout — your identity pinned left, everything else flows right.", features: ["Left identity column", "Left-aligned content", "Magazine-style feel"] },
              { id: "terminal", label: "Terminal", premium: false, desc: "A monospace hacker console with a blinking cursor and sharp corners.", features: ["Monospace font", "No blur, sharp edges", "Left-aligned console feel"] },
              { id: "banner", label: "Banner", premium: false, desc: "A tall hero banner with your avatar overlapping dramatically.", features: ["240px hero banner", "Overlapping avatar", "Bold entrance"] },
              { id: "compact", label: "Compact", premium: false, desc: "A tight, dense little card — fits more above the fold.", features: ["Smaller everything", "Denser spacing", "Fast to scan"] },
              { id: "aurora", label: "Aurora", premium: true, desc: "An oversized centered avatar wrapped in a glowing ambient halo.", features: ["Oversized avatar", "Ambient glow halo", "Premium exclusive"] },
              { id: "cinematic", label: "Cinematic", premium: true, desc: "A full-bleed hero banner with your avatar and name pinned bottom-left.", features: ["270px hero banner", "Avatar+name side-by-side", "Premium exclusive"] },
              { id: "dossier", label: "Dossier", premium: true, desc: "A wide identity-card layout with corner brackets and a big photo column.", features: ["1100px wide 2-column card", "Corner bracket accents", "Premium exclusive"] },
            ].map((t) => {
              const locked = t.premium && !props.isPremium;
              return (
                <div key={t.id} className={`template-card ${layoutTemplate === t.id ? "active" : ""}`}>
                  <div className="template-card-preview">
                    <div className={`template-card-preview-inner tpl-${t.id}`}>
                      <span className="tpl-dot" />
                      <span className="tpl-lines">
                        <span className="tpl-line" />
                        <span className="tpl-line short" />
                      </span>
                    </div>
                  </div>
                  <div className="template-card-name">{t.label}</div>
                  <span className={`template-card-badge ${t.premium ? "pro" : "free"}`}>{t.premium ? "PRO" : "FREE"}</span>
                  <p className="template-card-desc">{t.desc}</p>
                  <ul className="template-card-features">
                    {t.features.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                  <button
                    type="button"
                    className="btn btn-secondary btn-full btn-sm"
                    disabled={locked}
                    onClick={() => selectLayoutTemplate(t.id)}
                  >
                    {locked ? "🔒 Premium" : layoutTemplate === t.id ? "Selected" : "Select"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={`unsaved-bar ${dirty ? "visible" : ""}`}>
        <span className="unsaved-bar-text">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          You have unsaved changes!
        </span>
        <div className="unsaved-bar-actions">
          <button className="btn btn-secondary btn-sm" onClick={reset}>Reset</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
        </div>
      </div>
    </>
  );
}
