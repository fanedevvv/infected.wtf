"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ProfileInfoForm, { type ProfileInfoFormProps } from "../info/ProfileInfoForm";
import { EDITOR_TILES, type EditorTile } from "./tiles";
import { AliasesPanel, BestFriendPanel, SharingPanel, SkillsPanel } from "./ExtraPanels";
import { useT } from "@/lib/i18n/client";

type SaveState = { dirty: boolean; saving: boolean; save: () => void; reset: () => void };
type Device = "desktop" | "phone";

function encodeDraft(draft: Record<string, string>) {
  const bytes = new TextEncoder().encode(JSON.stringify(draft));
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Renders the live profile in an iframe scaled down to fit, so position:fixed layers behave like the real page. */
function LivePreview({ slug, draft, device, reloadKey }: { slug: string; draft: Record<string, string>; device: Device; reloadKey: number }) {
  const t = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [src, setSrc] = useState(`/${slug}?embed=1`);
  const frameWidth = device === "desktop" ? 1280 : 390;
  const frameHeight = device === "desktop" ? 800 : 780;

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
    const id = setTimeout(() => setSrc(`/${slug}?embed=1&draft=${encodeDraft(draft)}&r=${reloadKey}`), 600);
    return () => clearTimeout(id);
  }, [slug, draft, reloadKey]);

  return (
    <div className={`pe-preview pe-preview--${device}`} ref={boxRef}>
      <div className="pe-preview-frame" style={{ width: frameWidth * scale, height: frameHeight * scale }}>
        <iframe
          key={device}
          src={src}
          title={t("Live preview")}
          style={{ width: frameWidth, height: frameHeight, transform: `scale(${scale})`, transformOrigin: "0 0" }}
        />
      </div>
    </div>
  );
}

export default function ProfileEditor({
  tile,
  slug,
  panel,
  formProps,
}: {
  tile: EditorTile;
  slug: string;
  panel: React.ReactNode;
  formProps: ProfileInfoFormProps;
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
          {(["desktop", "phone"] as Device[]).map((d) => (
            <button key={d} type="button" className={device === d ? "active" : ""} onClick={() => setDevice(d)}>
              {d === "desktop" ? t("Desktop") : t("Phone")}
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

          {pending && activeTile !== tile && <p className="pe-loading">{t("Loading…")}</p>}
          {panelForTile && <div className="pe-server-panel">{panelForTile}</div>}
        </div>

        <aside className="pe-side">
          <div className="pe-side-sticky">
            <div className="pe-side-label">{t("Live preview")}</div>
            <LivePreview slug={slug} draft={draft} device={device} reloadKey={reloadKey} />
          </div>
        </aside>
      </div>
    </div>
  );
}
