"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "@/lib/toast";

const FONTS = ["Syne", "Outfit", "Space Mono", "Rajdhani", "Orbitron", "Bebas Neue", "Exo 2", "Josefin Sans"];

type Props = {
  avatar: string | null;
  backgroundType: string;
  backgroundValue: string;
  musicPath: string | null;
  cursorPath: string | null;
  displayName: string;
  location: string;
  bio: string;
  profileFont: string;
  profileOpacity: number;
  profileBlur: number;
};

export default function ProfileInfoForm(props: Props) {
  const [avatar, setAvatar] = useState(props.avatar);
  const [bgType, setBgType] = useState(props.backgroundType);
  const [bgValue, setBgValue] = useState(props.backgroundValue);
  const [musicPath, setMusicPath] = useState(props.musicPath);
  const [cursorPath, setCursorPath] = useState(props.cursorPath);

  const [displayName, setDisplayName] = useState(props.displayName);
  const [location, setLocation] = useState(props.location);
  const [bio, setBio] = useState(props.bio);
  const [font, setFont] = useState(props.profileFont);
  const [opacity, setOpacity] = useState(props.profileOpacity);
  const [blur, setBlur] = useState(props.profileBlur);

  const original = useRef({
    displayName: props.displayName,
    location: props.location,
    bio: props.bio,
    font: props.profileFont,
    opacity: props.profileOpacity,
    blur: props.profileBlur,
  });

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  const [musicUploading, setMusicUploading] = useState(false);
  const [cursorUploading, setCursorUploading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const cursorInputRef = useRef<HTMLInputElement>(null);
  const fontWrapRef = useRef<HTMLDivElement>(null);

  function checkDirty(next?: Partial<typeof original.current>) {
    const cur = {
      displayName,
      location,
      bio,
      font,
      opacity,
      blur,
      ...next,
    };
    const o = original.current;
    const isDirty =
      cur.displayName !== o.displayName ||
      cur.location !== o.location ||
      cur.bio !== o.bio ||
      cur.font !== o.font ||
      cur.opacity !== o.opacity ||
      cur.blur !== o.blur;
    setDirty(isDirty);
  }

  useEffect(() => {
    checkDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName, location, bio, font, opacity, blur]);

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
        setBgType(file.type === "video/mp4" ? "video" : "image");
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

  async function handleMusicChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      showToast("Max 20MB for audio files.", "error");
      return;
    }
    setMusicUploading(true);
    const fd = new FormData();
    fd.append("music", file);
    fd.append("type", "music");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (j.success) {
        setMusicPath(j.path);
        showToast("Music uploaded!", "success");
      } else {
        showToast(j.error || "Upload failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setMusicUploading(false);
      if (musicInputRef.current) musicInputRef.current.value = "";
    }
  }

  async function deleteMusic() {
    try {
      const fd = new FormData();
      fd.append("action", "delete_music");
      const r = await fetch("/api/update_profile", { method: "POST", body: fd });
      const j = await r.json();
      if (j.success) {
        setMusicPath(null);
        showToast("Music removed!", "success");
      } else showToast(j.error || "Error", "error");
    } catch {
      showToast("Delete error", "error");
    }
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
    fd.append("bio", bio);
    fd.append("profile_font", font);
    fd.append("avatar", avatar || "");
    fd.append("background_image", bgType === "image" ? bgValue : "");
    fd.append("profile_opacity", String(opacity));
    fd.append("profile_blur", String(blur));
    try {
      const res = await fetch("/api/update_profile", { method: "POST", body: fd });
      const j = await res.json();
      if (j.success) {
        showToast("Profile saved!", "success");
        original.current = { displayName, location, bio, font, opacity, blur };
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
    setBio(o.bio);
    setFont(o.font);
    setOpacity(o.opacity);
    setBlur(o.blur);
  }

  return (
    <>
      <div className="section-header">
        <h2>Profile Info</h2>
        <p>Customize what visitors see on your profile</p>
      </div>

      <div className="dash-card">
        <div style={{ display: "flex", alignItems: "center", gap: ".85rem", marginBottom: "1.25rem" }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,rgba(0,212,255,.2),rgba(255,0,255,.15))", border: "1.5px solid rgba(0,212,255,.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 16px rgba(0,212,255,.15)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
          </div>
          <div>
            <div style={{ fontSize: ".95rem", fontWeight: 700, color: "var(--text)" }}>Asset Uploads</div>
            <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Upload custom media files</div>
          </div>
        </div>

        <div className="upload-cards-grid">
          <div className="upload-card">
            <div className="upload-card-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              <div><div className="upload-card-title">Avatar</div><div className="upload-card-sub">Profile image</div></div>
              {avatar && <button type="button" className="upload-clear-btn" onClick={clearAvatar} title="Remove avatar">✕</button>}
            </div>
            <div className="upload-zone" onClick={() => avatarInputRef.current?.click()}>
              {avatar ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/${avatar}`} className="upload-preview-img" onError={(e) => { (e.target as HTMLImageElement).src = "/assets/img/default-avatar.png"; }} alt="" />
                  <span className="upload-badge">IMG</span>
                </>
              ) : (
                <div className="upload-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  <span>{avatarUploading ? "Uploading…" : "Click to upload"}</span>
                </div>
              )}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
          </div>

          <div className="upload-card">
            <div className="upload-card-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
              <div><div className="upload-card-title">Background</div><div className="upload-card-sub">Background image / video</div></div>
              {["image", "video"].includes(bgType) && bgValue && <button type="button" className="upload-clear-btn" onClick={clearBackground} title="Remove background">✕</button>}
            </div>
            <div className="upload-zone" onClick={() => bgInputRef.current?.click()}>
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                  <span>{bgUploading ? "Uploading…" : "Click to upload"}</span>
                </div>
              )}
            </div>
            <input ref={bgInputRef} type="file" accept="image/*,video/mp4" style={{ display: "none" }} onChange={handleBgChange} />
          </div>

          <div className="upload-card">
            <div className="upload-card-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
              <div><div className="upload-card-title">Audio</div><div className="upload-card-sub">Background music</div></div>
              {musicPath && <button type="button" className="upload-clear-btn" onClick={deleteMusic} title="Remove music">✕</button>}
            </div>
            <div className="upload-zone" style={{ cursor: "pointer" }} onClick={() => musicInputRef.current?.click()}>
              {musicPath ? (
                <div className="upload-placeholder">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36" style={{ color: "var(--accent)", opacity: 0.7 }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                  <span style={{ fontSize: ".72rem", wordBreak: "break-all", textAlign: "center", padding: "0 .5rem" }}>{musicPath.split("/").pop()}</span>
                  <span className="upload-badge" style={{ position: "static", marginTop: ".25rem" }}>MP3</span>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                  <span>{musicUploading ? "Uploading…" : "Click to upload"}</span>
                </div>
              )}
            </div>
            <input ref={musicInputRef} type="file" accept="audio/mpeg,audio/ogg,audio/wav,.mp3,.ogg,.wav" style={{ display: "none" }} onChange={handleMusicChange} />
          </div>

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

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.25rem", marginTop: ".25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".85rem", marginBottom: "1.25rem" }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,rgba(0,212,255,.2),rgba(255,0,255,.15))", border: "1.5px solid rgba(0,212,255,.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 16px rgba(0,212,255,.15)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" width="20" height="20"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </div>
            <div>
              <div style={{ fontSize: ".95rem", fontWeight: 700, color: "var(--text)" }}>Profile Information</div>
              <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Customize your public profile</div>
            </div>
          </div>

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
          <div className="form-group">
            <label>Bio</label>
            <textarea className="form-control" maxLength={300} placeholder="Tell people about yourself..." value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Profile font</label>
            <div className="font-select-wrapper" ref={fontWrapRef}>
              <div className="font-select-display" onClick={() => setFontOpen((o) => !o)}>
                <span>{font}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
              {fontOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50, background: "#111118", border: "1px solid rgba(255,255,255,.15)", borderRadius: "var(--radius-sm)", boxShadow: "0 8px 32px rgba(0,0,0,.8)", maxHeight: 220, overflowY: "auto" }}>
                  {FONTS.map((f) => (
                    <div key={f} className={`font-select-option ${f === font ? "active" : ""}`} onClick={() => { setFont(f); setFontOpen(false); }}>
                      {f}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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
      </div>

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
