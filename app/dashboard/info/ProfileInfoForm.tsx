"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "@/lib/toast";
import { useT } from "@/lib/i18n/client";
import { PROFILE_FONTS, googleFontsHref } from "@/lib/profile-fonts";
import { PROFILE_LAYOUTS, isPremiumLayout } from "@/lib/profile-layouts";
import LayoutThumb from "@/components/profile-layouts/LayoutThumb";


type Props = {
  tab: string;
  sub: string;
  avatar: string | null;
  banner: string | null;
  backgroundType: string;
  backgroundValue: string;
  musicTracks: (string | null)[];
  musicTrackTitle: string;
  musicTrackArtist: string;
  musicArtworkUrl: string;
  musicLyricsSynced: string;
  musicLyricsPlain: string;
  musicShowLyrics: boolean;
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
  /** Editor mode: render exactly these sections (visuals, audio, profile, colors, fonts, bg, template) instead of tab/sub. */
  sections?: string[];
  /** Editor mode: reports unsaved field values so the live preview can show them. */
  onDraftChange?: (draft: Record<string, string>) => void;
  /** Editor mode: lets the page header drive saving instead of the floating unsaved bar. */
  onSaveStateChange?: (state: { dirty: boolean; saving: boolean; save: () => void; reset: () => void }) => void;
};

export type { Props as ProfileInfoFormProps };

export default function ProfileInfoForm(props: Props) {
  const t = useT();
  const [avatar, setAvatar] = useState(props.avatar);
  const [banner, setBanner] = useState(props.banner);
  const [bgType, setBgType] = useState(props.backgroundType);
  const [bgValue, setBgValue] = useState(props.backgroundValue);
  const [musicTracks, setMusicTracks] = useState<(string | null)[]>(props.musicTracks);
  const [trackTitle, setTrackTitle] = useState(props.musicTrackTitle);
  const [trackArtist, setTrackArtist] = useState(props.musicTrackArtist);
  const [artworkUrl, setArtworkUrl] = useState(props.musicArtworkUrl);
  const [lyricsSynced, setLyricsSynced] = useState(props.musicLyricsSynced);
  const [lyricsPlain, setLyricsPlain] = useState(props.musicLyricsPlain);
  const [showLyrics, setShowLyrics] = useState(props.musicShowLyrics);
  const [findingArtwork, setFindingArtwork] = useState(false);
  const [findingLyrics, setFindingLyrics] = useState(false);
  const [musicMetaSaving, setMusicMetaSaving] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [findingFromYoutube, setFindingFromYoutube] = useState(false);
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

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast(t("Max 5MB"), "error");
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
        showToast(t("Avatar updated!"), "success");
      } else {
        showToast(j.error || "Upload failed", "error");
      }
    } catch {
      showToast(t("Network error"), "error");
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
        showToast(t("Avatar removed!"), "success");
      } else showToast(j.error || "Error", "error");
    } catch {
      showToast(t("Delete error"), "error");
    }
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      showToast(t("Max 8MB"), "error");
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
        showToast(t("Banner updated!"), "success");
      } else {
        showToast(j.error || "Upload failed", "error");
      }
    } catch {
      showToast(t("Network error"), "error");
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
        showToast(t("Banner removed!"), "success");
      } else showToast(j.error || "Error", "error");
    } catch {
      showToast(t("Delete error"), "error");
    }
  }

  async function handleBgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      showToast(t("Max 100MB"), "error");
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
        showToast(t("Background updated!"), "success");
      } else {
        showToast(j.error || "Upload failed", "error");
      }
    } catch {
      showToast(t("Network error"), "error");
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
        showToast(t("Background removed!"), "success");
      } else showToast(j.error || "Error", "error");
    } catch {
      showToast(t("Delete error"), "error");
    }
  }

  async function handleMusicChange(slot: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      showToast(t("Max 20MB for audio files."), "error");
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
        showToast(t("Track uploaded!"), "success");
      } else {
        showToast(j.error || "Upload failed", "error");
      }
    } catch {
      showToast(t("Network error"), "error");
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
        setTrackTitle("");
        setTrackArtist("");
        setArtworkUrl("");
        setLyricsSynced("");
        setLyricsPlain("");
        setShowLyrics(false);
        showToast(t("Track removed!"), "success");
      } else showToast(j.error || "Error", "error");
    } catch {
      showToast(t("Delete error"), "error");
    }
  }

  async function selectPlaylistStyle(style: string) {
    setPlaylistStyle(style);
  }

  async function saveMusicMetadata(overrides?: { trackTitle?: string; trackArtist?: string; artworkUrl?: string; lyricsSynced?: string; lyricsPlain?: string; showLyrics?: boolean }) {
    setMusicMetaSaving(true);
    const fd = new FormData();
    fd.append("action", "set_music_metadata");
    fd.append("track_title", overrides?.trackTitle ?? trackTitle);
    fd.append("track_artist", overrides?.trackArtist ?? trackArtist);
    fd.append("artwork_url", overrides?.artworkUrl ?? artworkUrl);
    fd.append("lyrics_synced", overrides?.lyricsSynced ?? lyricsSynced);
    fd.append("lyrics_plain", overrides?.lyricsPlain ?? lyricsPlain);
    fd.append("show_lyrics", (overrides?.showLyrics ?? showLyrics) ? "1" : "0");
    try {
      const res = await fetch("/api/update_profile", { method: "POST", body: fd });
      const j = await res.json();
      if (j.success) showToast(t("Saved!"), "success");
      else showToast(j.error || "Error", "error");
    } catch {
      showToast(t("Network error"), "error");
    } finally {
      setMusicMetaSaving(false);
    }
  }

  async function findArtwork() {
    if (!trackTitle.trim()) { showToast(t("Enter a track title first."), "error"); return; }
    setFindingArtwork(true);
    try {
      const res = await fetch("/api/music/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: trackTitle, artist: trackArtist }) });
      const j = await res.json();
      if (j.success && j.artworkUrl) {
        setArtworkUrl(j.artworkUrl);
        await saveMusicMetadata({ artworkUrl: j.artworkUrl });
        showToast(t("Artwork found!"), "success");
      } else {
        showToast(t("Couldn't find artwork for that track."), "error");
      }
    } catch {
      showToast(t("Network error"), "error");
    } finally {
      setFindingArtwork(false);
    }
  }

  async function findLyrics() {
    if (!trackTitle.trim()) { showToast(t("Enter a track title first."), "error"); return; }
    setFindingLyrics(true);
    try {
      const res = await fetch("/api/music/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: trackTitle, artist: trackArtist }) });
      const j = await res.json();
      if (j.success && j.lyricsSynced) {
        setLyricsSynced(j.lyricsSynced);
        setLyricsPlain(j.lyricsPlain || "");
        await saveMusicMetadata({ lyricsSynced: j.lyricsSynced, lyricsPlain: j.lyricsPlain || "" });
        showToast(t("Synced lyrics found!"), "success");
      } else if (j.success && j.lyricsPlain) {
        setLyricsSynced("");
        setLyricsPlain(j.lyricsPlain);
        await saveMusicMetadata({ lyricsSynced: "", lyricsPlain: j.lyricsPlain });
        showToast(t("Lyrics found (no line-by-line sync available for this track)."), "success");
      } else {
        showToast(t("Couldn't find lyrics for that track in any of our sources."), "error");
      }
    } catch {
      showToast(t("Network error"), "error");
    } finally {
      setFindingLyrics(false);
    }
  }

  async function findFromYoutube() {
    if (!youtubeUrl.trim()) { showToast(t("Paste a YouTube link first."), "error"); return; }
    setFindingFromYoutube(true);
    try {
      const res = await fetch("/api/music/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ youtubeUrl }) });
      const j = await res.json();
      if (!j.success) {
        showToast(j.error || "Couldn't read that video.", "error");
        return;
      }
      const resolvedTitle = j.resolvedTitle || trackTitle;
      const resolvedArtist = j.resolvedArtist || trackArtist;
      setTrackTitle(resolvedTitle);
      setTrackArtist(resolvedArtist);
      if (j.artworkUrl) setArtworkUrl(j.artworkUrl);
      setLyricsSynced(j.lyricsSynced || "");
      setLyricsPlain(j.lyricsPlain || "");
      await saveMusicMetadata({
        trackTitle: resolvedTitle,
        trackArtist: resolvedArtist,
        artworkUrl: j.artworkUrl || artworkUrl,
        lyricsSynced: j.lyricsSynced || "",
        lyricsPlain: j.lyricsPlain || "",
      });
      if (j.lyricsSynced) showToast(t("Found the exact track — synced lyrics loaded!"), "success");
      else if (j.lyricsPlain) showToast(t("Found the exact track — lyrics loaded (no sync available)."), "success");
      else showToast(t("Matched the track, but no lyrics were found for it."), "error");
    } catch {
      showToast(t("Network error"), "error");
    } finally {
      setFindingFromYoutube(false);
    }
  }

  async function toggleShowLyrics() {
    const next = !showLyrics;
    setShowLyrics(next);
    await saveMusicMetadata({ showLyrics: next });
  }

  function selectFont(id: string) {
    const def = PROFILE_FONTS.find((f) => f.id === id);
    if (!def) return;
    if (def.premium && !props.isPremium) {
      showToast(t("This font is an Infected Plus feature."), "error");
      return;
    }
    setFont(id);
  }

  function selectLayoutTemplate(tpl: string) {
    if (isPremiumLayout(tpl) && !props.isPremium) {
      showToast(t("This layout is an Infected Plus feature."), "error");
      return;
    }
    setLayoutTemplate(tpl);
  }

  async function handleCursorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast(t("Max 2MB for cursor."), "error");
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
        showToast(t("Cursor uploaded!"), "success");
      } else {
        showToast(j.error || "Upload failed", "error");
      }
    } catch {
      showToast(t("Network error"), "error");
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
        showToast(t("Cursor removed!"), "success");
      } else showToast(j.error || "Error", "error");
    } catch {
      showToast(t("Delete error"), "error");
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
        showToast(t("Profile saved!"), "success");
        original.current = { displayName, location, job, birthDate, bio, font, playlistStyle, layoutTemplate, opacity, blur, accentColor, backgroundColor, nameColor, bioColor, overlayColor };
        checkDirty();
      } else {
        showToast(j.error || "Error", "error");
      }
    } catch {
      showToast(t("Network error"), "error");
    } finally {
      setSaving(false);
    }
  }

  function show(section: string) {
    return props.sections ? props.sections.includes(section) : props.sub === section;
  }

  const { onDraftChange, onSaveStateChange } = props;
  useEffect(() => {
    onDraftChange?.({ displayName, bio, location, job, layoutTemplate, playlistStyle, accentColor, backgroundColor, nameColor, bioColor, overlayColor });
  }, [onDraftChange, displayName, bio, location, job, layoutTemplate, playlistStyle, accentColor, backgroundColor, nameColor, bioColor, overlayColor]);

  const saveRef = useRef(save);
  const resetRef = useRef(reset);
  useEffect(() => {
    saveRef.current = save;
    resetRef.current = reset;
  });
  useEffect(() => {
    onSaveStateChange?.({ dirty, saving, save: () => saveRef.current(), reset: () => resetRef.current() });
  }, [onSaveStateChange, dirty, saving]);

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
      {show("visuals") && (
        <div className="dash-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: ".25rem" }}>{t("Visuals")}</h3>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>{t("Avatar, background and banner")}</p>
          <div className="visuals-grid">
            <div className="visuals-col">
              <label className="visuals-label">{t("Avatar")}</label>
              <div className="upload-card upload-card--plain">
                {avatar && <button type="button" className="upload-clear-btn" onClick={clearAvatar} title={t("Remove avatar")}>✕</button>}
                <div className="upload-zone upload-zone--square" onClick={() => avatarInputRef.current?.click()}>
                  {avatar ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/${avatar}`} className="upload-preview-img" onError={(e) => { (e.target as HTMLImageElement).src = "/assets/img/default-avatar.png"; }} alt="" />
                      <span className="upload-badge">{t("IMG")}</span>
                    </>
                  ) : (
                    <div className="upload-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="30" height="30"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      <span>{avatarUploading ? "Uploading…" : "Upload avatar"}</span>
                      <span className="upload-hint">{t("jpg · png · gif · 10MB")}</span>
                    </div>
                  )}
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
              </div>
            </div>

            <div className="visuals-col">
              <label className="visuals-label">{t("Background")}</label>
              <div className="upload-card upload-card--plain">
                {["image", "video"].includes(bgType) && bgValue && <button type="button" className="upload-clear-btn" onClick={clearBackground} title={t("Remove background")}>✕</button>}
                <div className="upload-zone upload-zone--wide" onClick={() => bgInputRef.current?.click()}>
                  {bgType === "image" && bgValue ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/${bgValue}`} className="upload-preview-img" alt="" />
                      <span className="upload-badge">{t("IMG")}</span>
                    </>
                  ) : bgType === "video" && bgValue ? (
                    <>
                      <video className="upload-preview-img" autoPlay muted loop playsInline style={{ display: "block", background: "#000" }}>
                        <source src={`/${bgValue}`} />
                      </video>
                      <span className="upload-badge">{t("MP4")}</span>
                    </>
                  ) : (
                    <div className="upload-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="30" height="30"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                      <span>{bgUploading ? "Uploading…" : "Upload background"}</span>
                      <span className="upload-hint">{t("img · mp4 · webm · 100MB")}</span>
                    </div>
                  )}
                </div>
                <input ref={bgInputRef} type="file" accept="image/*,video/mp4,video/webm" style={{ display: "none" }} onChange={handleBgChange} />
              </div>

              <label className="visuals-label" style={{ marginTop: "1.1rem" }}>{t("Banner")}</label>
              <div className="upload-card upload-card--plain">
                {banner && <button type="button" className="upload-clear-btn" onClick={clearBanner} title={t("Remove banner")}>✕</button>}
                <div className="upload-zone upload-zone--wide" onClick={() => bannerInputRef.current?.click()}>
                  {banner ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/${banner}`} className="upload-preview-img" alt="" />
                      <span className="upload-badge">{t("IMG")}</span>
                    </>
                  ) : (
                    <div className="upload-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="30" height="30"><rect x="3" y="3" width="18" height="12" rx="2" /><path d="M3 11l4-3 5 4 5-3 4 3" /></svg>
                      <span>{bannerUploading ? "Uploading…" : "Upload banner"}</span>
                      <span className="upload-hint">{t("jpg · png · webp · 10MB")}</span>
                    </div>
                  )}
                </div>
                <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleBannerChange} />
              </div>
            </div>
          </div>
        </div>
      )}

      {show("audio") && (
        <div className="dash-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: ".25rem" }}>{t("Audio & Cursor")}</h3>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>{t("Background music, playlist tracks and custom cursor")}</p>

          <div className="form-group" style={{ marginBottom: "1.25rem" }}>
            <label>{t("Playlist Style")}</label>
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
                    <div><div className="upload-card-title">{t("Profile Track")}</div><div className="upload-card-sub">{t("Plays on your profile")}</div></div>
                    {trackPath && <button type="button" className="upload-clear-btn" onClick={() => deleteMusicTrack(slot)} title={t("Remove track")}>✕</button>}
                  </div>
                  <div className="upload-zone" style={{ cursor: "pointer" }} onClick={() => musicInputRefs[slot - 1].current?.click()}>
                    {trackPath ? (
                      <div className="upload-placeholder">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36" style={{ color: "var(--accent)", opacity: 0.7 }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                        <span style={{ fontSize: ".72rem", wordBreak: "break-all", textAlign: "center", padding: "0 .5rem" }}>{trackPath.split("/").pop()}</span>
                        <span className="upload-badge" style={{ position: "static", marginTop: ".25rem" }}>{t("MP3")}</span>
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

          {musicTracks[0] && (
            <div className="dash-card" style={{ marginTop: "1.25rem", background: "rgba(255,255,255,.02)" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: ".25rem" }}>{t("Track Info & Lyrics")}</h3>
              <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>{t("Find real artwork and synced lyrics for your profile track")}</p>

              <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginBottom: ".5rem" }}>
                <input
                  className="form-control"
                  style={{ flex: "1 1 240px" }}
                  placeholder={t("Paste a YouTube link for an exact match")}
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && findFromYoutube()}
                />
                <button type="button" className="int-btn int-btn-primary" onClick={findFromYoutube} disabled={findingFromYoutube}>
                  {findingFromYoutube ? t("Matching…") : t("Fetch from YouTube")}
                </button>
              </div>
              <p style={{ fontSize: ".75rem", color: "var(--text-muted)", marginBottom: "1rem" }}>{t("Reads the video's exact title/artist, so the lyrics match the song you meant — or fill the fields below yourself.")}</p>

              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                {artworkUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artworkUrl} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: ".5rem", flex: 1, minWidth: 200 }}>
                  <input className="form-control" placeholder={t("Exact song title (e.g. Bad Guy)")} value={trackTitle} onChange={(e) => setTrackTitle(e.target.value)} onBlur={() => saveMusicMetadata()} />
                  <input className="form-control" placeholder={t("Performing artist (e.g. Billie Eilish)")} value={trackArtist} onChange={(e) => setTrackArtist(e.target.value)} onBlur={() => saveMusicMetadata()} />
                </div>
              </div>

              <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                <button type="button" className="int-btn int-btn-outline" onClick={findArtwork} disabled={findingArtwork || musicMetaSaving}>
                  {findingArtwork ? t("Searching…") : t("Find track artwork")}
                </button>
                <button type="button" className="int-btn int-btn-outline" onClick={findLyrics} disabled={findingLyrics || musicMetaSaving}>
                  {findingLyrics ? t("Searching…") : t("Find lyrics")}
                </button>
              </div>

              {(lyricsSynced || lyricsPlain) && (
                <label style={{ display: "flex", alignItems: "center", gap: ".5rem", fontSize: ".85rem", color: "var(--text-muted)", cursor: "pointer" }}>
                  <input type="checkbox" checked={showLyrics} onChange={toggleShowLyrics} />
                  {lyricsSynced ? t("Show synced lyrics on profile") : t("Show lyrics on profile")}
                </label>
              )}
            </div>
          )}

          <div className="form-group" style={{ marginTop: "1.25rem", maxWidth: 320 }}>
            <label>{t("Custom Cursor")}</label>
            <div className="upload-card">
              <div className="upload-card-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M4 4l7.07 17 2.51-7.39L21 11.07z" /></svg>
                <div><div className="upload-card-title">{t("Custom Cursor")}</div><div className="upload-card-sub">{t("Upload a profile cursor")}</div></div>
                {cursorPath && <button type="button" className="upload-clear-btn" onClick={deleteCursor} title={t("Remove cursor")}>✕</button>}
              </div>
              <div className="upload-zone" style={{ cursor: "pointer" }} onClick={() => cursorInputRef.current?.click()}>
                {cursorPath ? (
                  <div className="upload-placeholder">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/${cursorPath}`} style={{ width: 42, height: 42, objectFit: "contain", opacity: 0.8 }} alt={t("cursor preview")} />
                    <span style={{ fontSize: ".72rem", wordBreak: "break-all", textAlign: "center", padding: "0 .5rem" }}>{cursorPath.split("/").pop()}</span>
                    <span className="upload-badge" style={{ position: "static", marginTop: ".25rem" }}>{t("WEBP")}</span>
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

      {show("profile") && (
        <div className="dash-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: ".25rem" }}>{t("Profile Details")}</h3>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>{t("Your public identity")}</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label>{t("Display name")}</label>
              <input type="text" className="form-control" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("Enter your display name")} maxLength={100} />
            </div>
            <div className="form-group">
              <label>{t("Location")}</label>
              <input type="text" className="form-control" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("Where are you from?")} maxLength={100} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>{t("Job / Occupation")}</label>
              <input type="text" className="form-control" value={job} onChange={(e) => setJob(e.target.value)} placeholder={t("What do you do?")} maxLength={100} />
            </div>
            <div className="form-group">
              <label>{t("Birth date")}</label>
              <input type="date" className="form-control" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
            </div>
          </div>
          <div className="form-group">
            <label>{t("Bio")}</label>
            <textarea className="form-control" maxLength={300} placeholder={t("Tell people about yourself...")} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
        </div>
      )}

      {show("colors") && (
        <div className="dash-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: ".25rem" }}>{t("Colors")}</h3>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>{t("Define your palette")}</p>
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

      {show("fonts") && (
        <div className="dash-card">
          <link rel="stylesheet" href={googleFontsHref(PROFILE_FONTS.map((f) => f.id)) || undefined} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: ".25rem" }}>{t("Typography")}</h3>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>{t("Font selection")}</p>
          <div className="font-grid">
            {PROFILE_FONTS.map((f) => {
              const locked = f.premium && !props.isPremium;
              return (
                <div key={f.id} className={`font-card ${f.id === font ? "active" : ""} ${locked ? "locked" : ""}`} onClick={() => selectFont(f.id)}>
                  {locked && <span className="font-card-lock">🔒</span>}
                  <span className="font-card-sample" style={{ fontFamily: f.family ? `'${f.id}', sans-serif` : "inherit" }}>Aa</span>
                  <span className="font-card-label">{t(f.label)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {show("bg") && (
        <div className="dash-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: ".25rem" }}>{t("Background")}</h3>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>{t("Opacity and blur of your profile card")}</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 0 20" /></svg>
                {t("Profile Opacity")}
                <span style={{ marginLeft: "auto", color: "var(--accent)", fontWeight: 700, letterSpacing: 0 }}>{opacity}%</span>
              </label>
              <input type="range" min={0} max={100} value={opacity} onChange={(e) => setOpacity(parseInt(e.target.value, 10))} style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
              <p style={{ fontSize: ".72rem", color: "var(--text-muted)", marginTop: ".4rem" }}>{t("Controls the transparency of your profile card (0% = fully transparent, 100% = fully opaque)")}</p>
            </div>
            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg>
                {t("Profile Blur")}
                <span style={{ marginLeft: "auto", color: "var(--accent)", fontWeight: 700, letterSpacing: 0 }}>{blur}px</span>
              </label>
              <input type="range" min={0} max={100} value={blur} onChange={(e) => setBlur(parseInt(e.target.value, 10))} style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
              <p style={{ fontSize: ".72rem", color: "var(--text-muted)", marginTop: ".4rem" }}>{t("Adds a backdrop blur effect to your profile card (0px = no blur, 100px = maximum blur)")}</p>
            </div>
          </div>
        </div>
      )}

      {show("template") && (
        <div className="dash-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: ".25rem" }}>{t("Choose your layout")}</h3>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1.1rem" }}>{t("Your content stays with you.")}</p>
          <div className="layout-picker">
            {PROFILE_LAYOUTS.map((l) => {
              const locked = l.premium && !props.isPremium;
              const selected = layoutTemplate === l.id;
              const applied = original.current.layoutTemplate === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  className={`layout-option${selected ? " is-selected" : ""}${l.comingSoon ? " is-soon" : ""}${locked ? " is-locked" : ""}`}
                  disabled={l.comingSoon}
                  onClick={() => selectLayoutTemplate(l.id)}
                  aria-pressed={selected}
                >
                  <LayoutThumb id={l.id} />
                  <span className="layout-option-name">{t(l.label)}</span>
                  {l.comingSoon ? (
                    <span className="layout-option-tag">{t("Coming soon")}</span>
                  ) : l.premium ? (
                    <span className="layout-option-tag layout-option-tag--plus">
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="5" y="11" width="14" height="10" rx="1" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                      {t("Premium")}
                    </span>
                  ) : null}
                  {applied && <span className="layout-option-applied">{t("Applied")}</span>}
                  {selected && <span className="layout-option-check" aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
          <p className="layout-picker-foot">{t("Switch layouts without losing your content.")}</p>
        </div>
      )}

      <div className={`unsaved-bar ${dirty && !onSaveStateChange ? "visible" : ""}`}>
        <span className="unsaved-bar-text">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          {t("You have unsaved changes!")}
        </span>
        <div className="unsaved-bar-actions">
          <button className="btn btn-secondary btn-sm" onClick={reset}>{t("Reset")}</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
        </div>
      </div>
    </>
  );
}
