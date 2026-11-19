"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_FREE_LAYOUT, FREE_CANVAS, FREE_ELEMENTS, FREE_ELEMENT_LABEL, FREE_ELEMENT_SIZE,
  type FreeElement, type FreeLayout,
} from "@/lib/free-layout";
import { useT } from "@/lib/i18n/client";

/** Within this many % of the centre line, a dragged block snaps onto it. */
const SNAP = 1.5;

/**
 * Drag-and-drop arranger for the Free Mode layout. Blocks stand in for the real profile elements at roughly their
 * real size, on the same fixed-size canvas the profile uses, so what you place here is where it shows up.
 */
export default function FreeLayoutEditor({ value, onChange }: { value: FreeLayout; onChange: (next: FreeLayout) => void }) {
  const t = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState<FreeElement | null>(null);
  const [snapped, setSnapped] = useState(false);
  const grab = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / FREE_CANVAS.width));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Pointer position → the block's centre in % of the canvas, kept fully on the canvas. */
  function positionFor(key: FreeElement, clientX: number, clientY: number) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const size = FREE_ELEMENT_SIZE[key];
    const halfW = (size.w / 2 / FREE_CANVAS.width) * 100;
    const halfH = (size.h / 2 / FREE_CANVAS.height) * 100;
    let x = ((clientX - rect.left) / rect.width) * 100 - grab.current.dx;
    const y = ((clientY - rect.top) / rect.height) * 100 - grab.current.dy;
    const snap = Math.abs(x - 50) < SNAP;
    if (snap) x = 50;
    setSnapped(snap);
    const clamp = (n: number, lo: number, hi: number) => Math.round(Math.min(hi, Math.max(lo, n)) * 2) / 2;
    return { x: clamp(x, Math.min(50, halfW), Math.max(50, 100 - halfW)), y: clamp(y, Math.min(50, halfH), Math.max(50, 100 - halfH)) };
  }

  function onPointerDown(key: FreeElement, e: React.PointerEvent) {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const item = value[key];
    // Remember where inside the block it was grabbed, so it doesn't jump under the pointer.
    grab.current = {
      dx: ((e.clientX - rect.left) / rect.width) * 100 - item.x,
      dy: ((e.clientY - rect.top) / rect.height) * 100 - item.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(key);
  }

  function onPointerMove(key: FreeElement, e: React.PointerEvent) {
    if (dragging !== key) return;
    const pos = positionFor(key, e.clientX, e.clientY);
    onChange({ ...value, [key]: { ...value[key], ...pos } });
  }

  function onPointerUp(e: React.PointerEvent) {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    setDragging(null);
    setSnapped(false);
  }

  function nudge(key: FreeElement, e: React.KeyboardEvent) {
    const step = e.shiftKey ? 5 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    const it = value[key];
    onChange({ ...value, [key]: { ...it, x: Math.min(100, Math.max(0, it.x + d[0])), y: Math.min(100, Math.max(0, it.y + d[1])) } });
  }

  const toggle = (key: FreeElement) => onChange({ ...value, [key]: { ...value[key], hidden: !value[key].hidden } });

  return (
    <div className="fle">
      <div className="fle-head">
        <div>
          <b>{t("Arrange your profile")}</b>
          <p>{t("Drag each block where you want it. It looks the same on phones and computers.")}</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange(DEFAULT_FREE_LAYOUT)}>{t("Reset")}</button>
      </div>

      <div ref={boxRef} className="fle-box" style={{ height: FREE_CANVAS.height * scale }}>
        <div ref={canvasRef} className="fle-canvas" style={{ width: FREE_CANVAS.width, height: FREE_CANVAS.height, transform: `scale(${scale})` }}>
          <i className={`fle-guide${snapped ? " is-on" : ""}`} aria-hidden="true" />
          {FREE_ELEMENTS.map((key) => {
            const it = value[key];
            if (it.hidden) return null;
            const size = FREE_ELEMENT_SIZE[key];
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                aria-label={`${t(FREE_ELEMENT_LABEL[key])} — ${t("drag, or use the arrow keys")}`}
                className={`fle-block fle-block--${key}${dragging === key ? " is-dragging" : ""}`}
                style={{ left: `${it.x}%`, top: `${it.y}%`, width: size.w, height: size.h }}
                onPointerDown={(e) => onPointerDown(key, e)}
                onPointerMove={(e) => onPointerMove(key, e)}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={(e) => nudge(key, e)}
              >
                <span>{t(FREE_ELEMENT_LABEL[key])}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fle-toggles">
        {FREE_ELEMENTS.map((key) => (
          <button key={key} type="button" className={`fle-toggle${value[key].hidden ? "" : " is-on"}`} onClick={() => toggle(key)} aria-pressed={!value[key].hidden}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              {value[key].hidden
                ? <><path d="M17.9 17.9A10 10 0 0 1 12 20c-7 0-10-8-10-8a18 18 0 0 1 5.1-5.9" /><path d="M9.9 4.2A9 9 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-2.2 3.2" /><path d="M2 2l20 20" /></>
                : <><path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z" /><circle cx="12" cy="12" r="3" /></>}
            </svg>
            {t(FREE_ELEMENT_LABEL[key])}
          </button>
        ))}
      </div>
      <p className="fle-foot">{t("Widgets, skills, projects and comments show below the canvas.")}</p>
    </div>
  );
}
