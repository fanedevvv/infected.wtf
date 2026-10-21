"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALES } from "@/lib/i18n/shared";
import { setLocaleCookie, useLocale, useT } from "@/lib/i18n/client";
import { applyDashTheme, DASH_ACCENT_PRESETS, normalizeAccent, saveDashThemeCookies, type DashMode } from "@/lib/dash-theme";

function useOutsideClose<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);
  return ref;
}

export function LanguagePicker() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const current = LOCALES.find((l) => l.id === locale) ?? LOCALES[0];

  return (
    <div className="dp-wrap" ref={ref}>
      <button type="button" className="dp-pill" onClick={() => setOpen((o) => !o)} title={t("Language")} aria-haspopup="listbox" aria-expanded={open}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
        <span className="dp-pill-text">{current.short}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11" className="dp-chev"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && (
        <div className="dp-menu" role="listbox">
          {LOCALES.map((l) => (
            <button
              key={l.id}
              type="button"
              role="option"
              aria-selected={l.id === locale}
              className={`dp-menu-item ${l.id === locale ? "active" : ""}`}
              onClick={() => {
                setOpen(false);
                if (l.id === locale) return;
                setLocaleCookie(l.id);
                router.refresh();
              }}
            >
              {l.label}
              {l.id === locale && <span className="dp-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ThemePicker({ mode, accent, onChange }: { mode: DashMode; accent: string; onChange: (mode: DashMode, accent: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [draftMode, setDraftMode] = useState(mode);
  const [draftAccent, setDraftAccent] = useState(accent);
  const [hex, setHex] = useState(accent);

  function openModal() {
    setDraftMode(mode);
    setDraftAccent(accent);
    setHex(accent);
    setOpen(true);
  }

  function preview(m: DashMode, a: string) {
    setDraftMode(m);
    setDraftAccent(a);
    applyDashTheme(m, a);
  }

  function cancel() {
    applyDashTheme(mode, accent);
    setOpen(false);
  }

  function save() {
    saveDashThemeCookies(draftMode, draftAccent);
    onChange(draftMode, draftAccent);
    setOpen(false);
  }

  return (
    <>
      <button type="button" className="dp-pill" onClick={openModal} title={t("Theme")}>
        <span className="dp-swatch" style={{ background: accent }} />
        <span className="dp-pill-text">{t("Theme")}</span>
      </button>
      {open && (
        <div className="dp-overlay" onMouseDown={(e) => e.target === e.currentTarget && cancel()}>
          <div className="dp-modal" role="dialog" aria-modal="true" aria-label={t("Theme")}>
            <div className="dp-modal-head">
              <h3>{t("Theme")}</h3>
              <button type="button" className="dp-close" onClick={cancel} aria-label={t("Close")}>✕</button>
            </div>

            <div className="dp-mode">
              {(["dark", "light"] as DashMode[]).map((m) => (
                <button key={m} type="button" className={`dp-mode-btn ${draftMode === m ? "active" : ""}`} onClick={() => preview(m, draftAccent)}>
                  {m === "dark" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                  )}
                  {m === "dark" ? t("Dark") : t("Light")}
                </button>
              ))}
            </div>

            <div className="dp-swatches">
              {DASH_ACCENT_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`dp-swatch-btn ${draftAccent === c ? "active" : ""}`}
                  style={{ background: c }}
                  onClick={() => { setHex(c); preview(draftMode, c); }}
                  aria-label={c}
                >
                  {draftAccent === c && <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" width="16" height="16"><polyline points="20 6 9 17 4 12" /></svg>}
                </button>
              ))}
            </div>

            <div className="dp-custom">
              <div className="dp-custom-label">{t("Custom color")}</div>
              <div className="dp-custom-row">
                <label className="dp-custom-swatch" style={{ background: draftAccent }}>
                  <input type="color" value={draftAccent} onChange={(e) => { setHex(e.target.value); preview(draftMode, e.target.value); }} />
                </label>
                <input
                  className="dp-hex"
                  value={hex}
                  maxLength={7}
                  spellCheck={false}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    if (!/^#?[0-9a-fA-F]{0,6}$/.test(v)) return;
                    const withHash = v.startsWith("#") ? v : `#${v}`;
                    setHex(withHash);
                    if (/^#[0-9a-fA-F]{6}$/.test(withHash)) preview(draftMode, normalizeAccent(withHash));
                  }}
                />
              </div>
            </div>

            <button type="button" className="dp-save" onClick={save}>{t("Save")}</button>
          </div>
        </div>
      )}
    </>
  );
}
