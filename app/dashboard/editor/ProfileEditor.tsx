"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ProfileInfoForm, { type ProfileInfoFormProps } from "../info/ProfileInfoForm";
import { EDITOR_TILES, type EditorTile } from "./tiles";
import { AliasesPanel, BestFriendPanel, SharingPanel, SkillsPanel, SocialEmbedPanel } from "./ExtraPanels";
import { useT } from "@/lib/i18n/client";

type SaveState = { dirty: boolean; saving: boolean; save: () => void; reset: () => void };
type Device = "desktop" | "tablet" | "phone";

const FRAME_SIZE: Record<Device, { w: number; h: number }> = {
  desktop: { w: 1280, h: 800 },
  tablet: { w: 834, h: 1024 },
  phone: { w: 390, h: 780 },
};

function encodeDraft(draft: Record<string, string>) {
  const bytes = new TextEncoder().encode(JSON.stringify(draft));
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Side-by-side "Live" (what's actually saved and public) vs "Draft" (your
 * unsaved edits) — both iframes stay mounted, a draggable handle clips the
 * draft one so you can drag across the whole page to compare, instead of
 * flipping between two separate views.
 */
function ComparisonPreview({ slug, draft, device, reloadKey }: { slug: string; draft: Record<string, string>; device: Device; reloadKey: number }) {
  const t = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [draftSrc, setDraftSrc] = useState(`/${slug}?embed=1`);
  const [split, setSplit] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const { w: frameWidth, h: frameHeight } = FRAME_SIZE[device];
  const liveSrc = `/${slug}?embed=1`;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const update = () => setScale(Math.min(1, box.clientWidth / frameWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    return () => ro.disconnect();
  }, [frameWidth]);

  // Debounced so typing in the bio doesn't reload the frame on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDraftSrc(`/${slug}?embed=1&draft=${encodeDraft(draft)}&r=${reloadKey}`), 600);
    return () => clearTimeout(id);
  }, [slug, draft, reloadKey]);

  const updateSplitFromPointer = useCallback((clientX: number) => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.max(0, Math.min(100, pct)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const x = "touches" in e ? e.touches[0]?.clientX : e.clientX;
      if (x != null) updateSplitFromPointer(x);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, updateSplitFromPointer]);

  function toggleFullscreen() {
    const box = boxRef.current;
    if (!box) return;
    if (!document.fullscreenElement) {
      box.requestFullscreen?.().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setFullscreen(false)).catch(() => {});
    }
  }

  return (
    <div className={`pe-preview pe-preview--${device} ${fullscreen ? "pe-preview--fullscreen" : ""}`} ref={boxRef}>
      <div className="pe-compare-bar">
        <span className="pe-compare-pill pe-compare-pill--live">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>
          {t("Live")}
        </span>
        <button type="button" className="pe-fullscreen-btn" onClick={toggleFullscreen} title={t("Fullscreen")}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m11-5v3a2 2 0 0 1-2 2h-3" /></svg>
        </button>
        <span className="pe-compare-pill pe-compare-pill--draft">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
          {t("Draft")}
        </span>
      </div>

      <div className="pe-preview-frame" ref={frameRef} style={{ width: frameWidth * scale, height: frameHeight * scale }}>
        <iframe key={`live-${device}`} src={liveSrc} title={t("Live")} style={{ width: frameWidth, height: frameHeight, transform: `scale(${scale})`, transformOrigin: "0 0" }} />
        <div className="pe-compare-draft-layer" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
          <iframe key={`draft-${device}`} src={draftSrc} title={t("Draft")} style={{ width: frameWidth, height: frameHeight, transform: `scale(${scale})`, transformOrigin: "0 0" }} />
        </div>
        <div className="pe-compare-handle" style={{ left: `${split}%` }} onMouseDown={() => setDragging(true)} onTouchStart={() => setDragging(true)}>
          <span className="pe-compare-handle-grip">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 7 3 12 8 17" /><polyline points="16 7 21 12 16 17" /></svg>
          </span>
        </div>
      </div>
      <p className="pe-compare-hint">{t("Drag the handle to compare what you've saved with what visitors see now.")}</p>
    </div>
  );
}

export default function ProfileEditor({
  tile,
  slug,
  panel,
  formProps,
  views,
}: {
  tile: EditorTile;
  slug: string;
  panel: React.ReactNode;
  formProps: ProfileInfoFormProps;
  views: number;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [device, setDevice] = useState<Device>("desktop");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // While a tile switch is in flight show the requested tile; otherwise follow the URL (so Back works).
  const [requestedTile, setRequestedTile] = useState(tile);
  const activeTile = pending ? requestedTile : tile;
  const current = EDITOR_TILES.find((x) => x.id === activeTile) ?? EDITOR_TILES[0];

  const onDraftChange = useCallback((d: Record<string, string>) => setDraft(d), []);
  const onSaveStateChange = useCallback((s: SaveState) => setSaveState(s), []);

  // Uploads and other panels save immediately; refresh the preview after they've had time to land.
  useEffect(() => {
    if (!saveState || saveState.saving) return;
    const id = setTimeout(() => setReloadKey((k) => k + 1), 300);
    return () => clearTimeout(id);
  }, [saveState?.saving]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectTile(id: EditorTile) {
    setRequestedTile(id);
    startTransition(() => router.replace(`/dashboard?page=editor&tile=${id}`, { scroll: false }));
  }

  const panelForTile = activeTile === tile ? panel : null;

  return (
    <div className="pe-page">
      <div className="pe-head">
        <h2>{t("Profile editor")}</h2>
        <p>{t("Make it yours. Changes stay private until you save.")}</p>
      </div>

      <div className="pe-toolbar">
        <div className="pe-device">
          {(["desktop", "tablet", "phone"] as Device[]).map((d) => (
            <button key={d} type="button" className={device === d ? "active" : ""} onClick={() => setDevice(d)} title={d === "desktop" ? t("Desktop") : d === "tablet" ? t("Tablet") : t("Phone")}>
              {d === "desktop" ? (
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
              ) : d === "tablet" ? (
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M12 18h.01" /></svg>
              )}
            </button>
          ))}
        </div>
        <a className="pe-live" href={`/${slug}`} target="_blank" rel="noopener">{t("Live page")}</a>
        <button type="button" className="pe-save" disabled={!saveState?.dirty || saveState.saving} onClick={() => saveState?.save()}>
          {saveState?.saving ? t("Saving…") : t("Save changes")}
        </button>
        {saveState?.dirty && (
          <button type="button" className="pe-reset" onClick={() => saveState.reset()}>{t("Discard")}</button>
        )}
      </div>

      <div className="pe-layout">
        <div className="pe-main">
          <div className="pe-tiles">
            {EDITOR_TILES.map((x) => (
              <button key={x.id} type="button" className={`pe-tile ${activeTile === x.id ? "active" : ""}`} onClick={() => selectTile(x.id)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><path d={x.icon} /></svg>
                <span>{t(x.label)}</span>
              </button>
            ))}
          </div>

          <div className="pe-section-head">
            <h3>{t(current.label)}</h3>
            <p>{t(current.desc)}</p>
          </div>

          {/* Kept mounted for every tile so unsaved edits survive switching tiles. */}
          <div style={{ display: current.form.length ? undefined : "none" }}>
            <ProfileInfoForm {...formProps} sections={current.form} onDraftChange={onDraftChange} onSaveStateChange={onSaveStateChange} />
          </div>

          {activeTile === "aliases" && <AliasesPanel slug={slug} />}
          {activeTile === "bestfriend" && <BestFriendPanel onChange={() => setReloadKey((k) => k + 1)} />}
          {activeTile === "sharing" && <SharingPanel slug={slug} />}
          {activeTile === "skills" && <SkillsPanel onSaved={() => setReloadKey((k) => k + 1)} />}
          {activeTile === "social" && (
            <SocialEmbedPanel
              isPremium={formProps.isPremium}
              username={slug}
              displayName={formProps.displayName || slug}
              bio={formProps.bio}
              views={views}
              accentColor={formProps.accentColor}
              avatar={formProps.avatar}
            />
          )}

          {pending && activeTile !== tile && <p className="pe-loading">{t("Loading…")}</p>}
          {panelForTile && <div className="pe-server-panel">{panelForTile}</div>}
        </div>

        <aside className="pe-side">
          <div className="pe-side-sticky">
            <div className="pe-side-label">{t("Live preview")}</div>
            <ComparisonPreview slug={slug} draft={draft} device={device} reloadKey={reloadKey} />
          </div>
        </aside>
      </div>
    </div>
  );
}
