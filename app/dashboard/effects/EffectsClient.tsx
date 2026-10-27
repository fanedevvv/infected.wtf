"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SHOP_EFFECTS } from "@/lib/shop";
import { showToast } from "@/lib/toast";
import EffectPreviewCanvas from "@/components/EffectPreviewCanvas";
import EffectText, { TEXT_EFFECTS } from "@/components/EffectText";
import { useT } from "@/lib/i18n/client";

type Props = {
  isPremium: boolean;
  particleEffect: boolean;
  cursorTrail: boolean;
  nameEffect: string;
  bioEffect: string;
  avatarRing: string;
  avatarShape: string;
  displayName: string;
  bio: string;
  purchasedEffects: string[];
  activeEffects: Record<string, string>;
  section?: "full" | "bg" | "cursor" | "text" | "avatar";
};

const SHAPES: { key: string; label: string; cls: string }[] = [
  { key: "square", label: "Square", cls: "sq" },
  { key: "soft", label: "Soft", cls: "sft" },
  { key: "rounded", label: "Rounded", cls: "rnd" },
  { key: "circle", label: "Circle", cls: "cir" },
  { key: "eye", label: "Eye", cls: "eye" },
  { key: "diamond", label: "Diamond", cls: "dia" },
  { key: "egg", label: "Egg", cls: "egg" },
];

const BG_IDS = Object.entries(SHOP_EFFECTS).filter(([, e]) => e.type === "bg").map(([id]) => id);
const CURSOR_IDS = Object.entries(SHOP_EFFECTS).filter(([, e]) => e.type === "cursor").map(([id]) => id);
const AVATAR_IDS = Object.entries(SHOP_EFFECTS).filter(([, e]) => e.type === "avatar").map(([id]) => id);

function ParticlesPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "radial-gradient(circle at 30% 60%, color-mix(in srgb, var(--accent) 35%, transparent), transparent 65%)",
    pointerEvents: "none",
  };
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let W = 0, H = 0;
    type Star = { x: number; y: number; r: number; a: number; da: number; sh: boolean; sx: number; sy: number; sl: number };
    let stars: Star[] = [];
    let raf = 0;
    function mk(): Star {
      return { x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.2 + 0.3, a: Math.random(), da: (Math.random() * 0.008 + 0.003) * (Math.random() < 0.5 ? 1 : -1), sh: Math.random() < 0.05, sx: 0, sy: 0, sl: 0 };
    }
    function resize() {
      const r = canvas!.parentElement!.getBoundingClientRect();
      W = canvas!.width = r.width;
      H = canvas!.height = r.height;
    }
    function init() {
      stars = [];
      for (let i = 0; i < 50; i++) stars.push(mk());
    }
    function draw() {
      ctx!.clearRect(0, 0, W, H);
      for (const s of stars) {
        s.a += s.da;
        if (s.a <= 0 || s.a >= 1) s.da *= -1;
        if (s.sh) {
          s.sx += 2.2;
          s.sy += 0.7;
          s.sl++;
          ctx!.save();
          ctx!.globalAlpha = Math.max(0, 1 - s.sl / 45);
          ctx!.strokeStyle = "rgba(57,255,20,.85)";
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(s.x, s.y);
          ctx!.lineTo(s.x + s.sx, s.y + s.sy);
          ctx!.stroke();
          ctx!.restore();
          if (s.sl > 45) {
            Object.assign(s, mk());
            s.sh = Math.random() < 0.05;
            s.sx = s.sy = s.sl = 0;
          }
        } else {
          ctx!.save();
          ctx!.globalAlpha = s.a;
          ctx!.fillStyle = "#fff";
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.restore();
        }
      }
      raf = requestAnimationFrame(draw);
    }
    resize();
    init();
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="effect-preview" style={{ position: "relative" }}>
      <div style={glowStyle} />
      <canvas ref={canvasRef} />
    </div>
  );
}

function CursorTrailPreview() {
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const colors = ["#39ff14", "#ff4dff", "#ffd700", "#00ffb8", "#ff6b6b", "#a78bfa", "#fb923c"];
    const dots: HTMLDivElement[] = [];
    for (let i = 0; i < 7; i++) {
      const d = document.createElement("div");
      d.className = "cursor-dot";
      const sz = Math.max(4, 15 - i * 1.6);
      const glow = Math.max(0, 12 - i * 1.6);
      const c = colors[i % colors.length];
      d.style.cssText = `width:${sz}px;height:${sz}px;background:${c};box-shadow:0 0 ${glow}px ${glow * 0.6}px ${c};left:50%;top:50%;opacity:0;animation:ct-move ${2 + i * 0.2}s ease-in-out ${i * 0.16}s infinite;`;
      wrap.appendChild(d);
      dots.push(d);
    }
    return () => dots.forEach((d) => d.remove());
  }, []);
  return <div className="effect-preview" ref={wrapRef} />;
}


function ToggleSwitch({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <div className={`effect-toggle-switch ${active ? "active" : ""}`} onClick={onClick}>
      <div className="effect-toggle-knob" />
    </div>
  );
}

export default function EffectsClient(props: Props) {
  const t = useT();
  const [particle, setParticle] = useState(props.particleEffect);
  const [cursorTrail, setCursorTrail] = useState(props.cursorTrail);
  const [nameEffect, setNameEffect] = useState(props.nameEffect);
  const [bioEffect, setBioEffect] = useState(props.bioEffect);
  const [ring, setRing] = useState(props.avatarRing);
  const [shape, setShape] = useState(props.avatarShape);
  const [active, setActive] = useState<Record<string, string>>(props.activeEffects);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const original = useRef({
    particle: props.particleEffect,
    cursorTrail: props.cursorTrail,
    nameEffect: props.nameEffect,
    bioEffect: props.bioEffect,
    ring: props.avatarRing,
    shape: props.avatarShape,
    bg: props.activeEffects.bg ?? null,
    cursor: props.activeEffects.cursor ?? null,
    avatar: props.activeEffects.avatar ?? null,
  });

  const owned = new Set(props.purchasedEffects);

  function checkDirty(next?: {
    particle?: boolean;
    cursorTrail?: boolean;
    nameEffect?: string;
    bioEffect?: string;
    ring?: string;
    shape?: string;
    active?: Record<string, string>;
  }) {
    const curParticle = next?.particle ?? particle;
    const curCursorTrail = next?.cursorTrail ?? cursorTrail;
    const curNameEffect = next?.nameEffect ?? nameEffect;
    const curBioEffect = next?.bioEffect ?? bioEffect;
    const curRing = next?.ring ?? ring;
    const curShape = next?.shape ?? shape;
    const curActive = next?.active ?? active;
    const o = original.current;
    const isDirty =
      curParticle !== o.particle ||
      curCursorTrail !== o.cursorTrail ||
      curNameEffect !== o.nameEffect ||
      curBioEffect !== o.bioEffect ||
      curRing !== o.ring ||
      curShape !== o.shape ||
      (curActive.bg ?? null) !== o.bg ||
      (curActive.cursor ?? null) !== o.cursor ||
      (curActive.avatar ?? null) !== o.avatar;
    setDirty(isDirty);
  }

  useEffect(() => {
    checkDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particle, cursorTrail, nameEffect, bioEffect, ring, shape, active]);

  function togglePar() {
    const on = !particle;
    setParticle(on);
    if (on) {
      setActive((a) => {
        const n = { ...a };
        delete n.bg;
        return n;
      });
    }
  }
  function toggleCur() {
    const on = !cursorTrail;
    setCursorTrail(on);
    if (on) {
      setActive((a) => {
        const n = { ...a };
        delete n.cursor;
        return n;
      });
    }
  }
  function selectNameEffect(id: string) {
    setNameEffect(id);
  }
  function selectBioEffect(id: string) {
    setBioEffect(id);
  }
  function toggleRing(type: "normal" | "premium") {
    const newRing = ring === type ? "none" : type;
    setRing(newRing);
    if (newRing !== "none") {
      setActive((a) => {
        const n = { ...a };
        delete n.avatar;
        return n;
      });
    }
  }

  function togglePurchased(effectId: string, effectType: "bg" | "cursor" | "avatar") {
    const isActive = active[effectType] === effectId;
    const newId = isActive ? null : effectId;

    setActive((a) => {
      const n = { ...a };
      if (newId) n[effectType] = newId;
      else delete n[effectType];
      return n;
    });
    if (newId) {
      if (effectType === "bg") setParticle(false);
      if (effectType === "cursor") setCursorTrail(false);
      if (effectType === "avatar") setRing("none");
    }
  }

  function selectShape(newShape: string) {
    setShape(newShape);
  }

  async function saveChanges() {
    setSaving(true);
    try {
      const freeFd = new FormData();
      freeFd.append("action", "effects-form");
      if (particle) freeFd.append("particle_effect", "1");
      if (cursorTrail) freeFd.append("cursor_trail", "1");
      freeFd.append("avatar_ring", ring);
      freeFd.append("name_effect", nameEffect);
      freeFd.append("bio_effect", bioEffect);

      const freeRes = await fetch("/api/update_profile", { method: "POST", body: freeFd });
      const freeJson = await freeRes.json();
      if (!freeJson.success) {
        showToast(freeJson.error || "Error", "error");
        return;
      }

      const shapeFd = new FormData();
      shapeFd.append("action", "save_avatar_shape");
      shapeFd.append("avatar_shape", shape);
      const shapeRes = await fetch("/api/update_profile", { method: "POST", body: shapeFd });
      const shapeJson = await shapeRes.json();
      if (!shapeJson.success) {
        showToast(shapeJson.error || "Error", "error");
        return;
      }

      const slots: Array<"bg" | "cursor" | "avatar"> = ["bg", "cursor", "avatar"];
      for (const slot of slots) {
        const nextId = active[slot] ?? null;
        const prevId = original.current[slot];
        if (nextId === prevId) continue;
        const equipRes = await fetch("/api/shop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "equip_effect", effectId: nextId ?? "", slot }),
        });
        const equipJson = await equipRes.json();
        if (!equipJson.success) {
          showToast(equipJson.error || "Error", "error");
          return;
        }
      }

      original.current = {
        particle,
        cursorTrail,
        nameEffect,
        bioEffect,
        ring,
        shape,
        bg: active.bg ?? null,
        cursor: active.cursor ?? null,
        avatar: active.avatar ?? null,
      };
      checkDirty();
      showToast(t("Changes saved!"), "success");
    } catch {
      showToast(t("Network error"), "error");
    } finally {
      setSaving(false);
    }
  }

  function resetChanges() {
    const o = original.current;
    setParticle(o.particle);
    setCursorTrail(o.cursorTrail);
    setNameEffect(o.nameEffect);
    setBioEffect(o.bioEffect);
    setRing(o.ring);
    setShape(o.shape);
    setActive((prev) => {
      const next = { ...prev };
      if (o.bg) next.bg = o.bg;
      else delete next.bg;
      if (o.cursor) next.cursor = o.cursor;
      else delete next.cursor;
      if (o.avatar) next.avatar = o.avatar;
      else delete next.avatar;
      return next;
    });
  }

  // A render helper, not a component: a nested component would remount every preview canvas on each render.
  function purchasedEffectGrid(ids: string[], type: "bg" | "cursor" | "avatar") {
    return (
      <>
        {ids.map((id) => {
          const e = SHOP_EFFECTS[id];
          const isOwned = owned.has(id);
          const isActive = active[type] === id;
          return (
            <div key={id} className={`effect-card ${isActive ? "active" : ""} ${!isOwned ? "effect-locked" : ""}`}>
              <div className="effect-preview pef-preview">
                <EffectPreviewCanvas effectId={id} />
                {!isOwned && (
                  <div className="lock-overlay">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                    <span>{t("Not Owned")}</span>
                  </div>
                )}
              </div>
              <div className="effect-card-name" style={{ color: e.color }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
                {e.name}
              </div>
              <div className="effect-card-desc">{e.desc}</div>
              {isOwned ? (
                <div className="effect-toggle-wrap">
                  <span className="effect-toggle-text">{isActive ? "Enabled" : "Disabled"}</span>
                  <ToggleSwitch active={isActive} onClick={() => togglePurchased(id, type)} />
                </div>
              ) : (
                <Link href="/dashboard?page=shop#effects" className="pef-buy-link">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
                  {t("Buy in Shop")}
                </Link>
              )}
            </div>
          );
        })}
      </>
    );
  }

  const section = props.section ?? "full";
  const show = (s: string) => section === "full" || section === s;

  return (
    <>
      {section === "full" && <div className="section-header"><h2>{t("Visual Effects")}</h2><p>{t("Enable or disable special effects")}</p></div>}

      {show("bg") && (
      <div className="fx-section">
        <div className="fx-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
          {t("Background Effects")}
        </div>
        <div className="effects-grid">
          <div className={`effect-card ${particle ? "active" : ""}`}>
            <ParticlesPreview />
            <div className="effect-card-name">{t("Particles / Stars")}</div>
            <div className="effect-card-desc">{t("Stars and shooting stars animation on your profile background")}</div>
            <div className="effect-toggle-wrap">
              <span className="effect-toggle-text">{particle ? "Enabled" : "Disabled"}</span>
              <ToggleSwitch active={particle} onClick={togglePar} />
            </div>
          </div>
          {purchasedEffectGrid(BG_IDS, "bg")}
        </div>
      </div>
      )}

      {show("cursor") && (
      <div className="fx-section">
        <div className="fx-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M4 4l7.07 17 2.51-7.39L21 11.07z" /></svg>
          {t("Cursor Effects")}
        </div>
        <div className="effects-grid">
          <div className={`effect-card ${cursorTrail ? "active" : ""}`}>
            <CursorTrailPreview />
            <div className="effect-card-name">{t("Cursor Trail")}</div>
            <div className="effect-card-desc">{t("Leaves a colorful trail as visitors move their mouse on your profile")}</div>
            <div className="effect-toggle-wrap">
              <span className="effect-toggle-text">{cursorTrail ? "Enabled" : "Disabled"}</span>
              <ToggleSwitch active={cursorTrail} onClick={toggleCur} />
            </div>
          </div>
          {purchasedEffectGrid(CURSOR_IDS, "cursor")}
        </div>
      </div>
      )}

      {show("text") && (
      <>
      <div className="fx-section">
        <div className="fx-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>
          {t("Name Effect")}
        </div>
        <div className="text-fx-grid">
          {TEXT_EFFECTS.map((fx) => (
            <button key={fx.id} type="button" className={`text-fx-card ${nameEffect === fx.id ? "active" : ""}`} onClick={() => selectNameEffect(fx.id)}>
              <div className="text-fx-preview">
                <EffectText text={props.displayName || "Preview"} effect={fx.id} active />
              </div>
              <span className="text-fx-label">{fx.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="fx-section">
        <div className="fx-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M4 7V4h16v3M9 20h6M12 4v16" /></svg>
          {t("Bio Effect")}
        </div>
        <div className="text-fx-grid">
          {TEXT_EFFECTS.map((fx) => (
            <button key={fx.id} type="button" className={`text-fx-card ${bioEffect === fx.id ? "active" : ""}`} onClick={() => selectBioEffect(fx.id)}>
              <div className="text-fx-preview">
                <EffectText text={props.bio || "Your bio text"} effect={fx.id} active />
              </div>
              <span className="text-fx-label">{fx.label}</span>
            </button>
          ))}
        </div>
      </div>
      </>
      )}

      {show("avatar") && (
      <>
      <div className="fx-section">
        <div className="fx-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="5" /></svg>
          {t("Avatar Rings & Effects")}
        </div>
        <div className="effects-grid">
          <div className={`effect-card ${ring === "normal" ? "active" : ""}`}>
            <div className="effect-preview" style={{ overflow: "visible" }}>
              <div className="ring-preview-wrap">
                <div className="ring-preview-shell"><div className="ring-preview-spin rp-spin-accent" /></div>
                <div className="ring-preview-inner" />
                <div className="ring-preview-avatar" />
              </div>
            </div>
            <div className="effect-card-name">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11" style={{ color: "var(--accent)" }}><circle cx="12" cy="12" r="10" /></svg>
              {t("Accent Ring")}
            </div>
            <div className="effect-card-desc">{t("Spinning gradient ring using your profile accent colors")}</div>
            <div className="effect-toggle-wrap">
              <span className="effect-toggle-text">{ring === "normal" ? "Enabled" : "Disabled"}</span>
              <ToggleSwitch active={ring === "normal"} onClick={() => toggleRing("normal")} />
            </div>
          </div>

          <div className={`effect-card ${ring === "premium" ? "active" : ""} ${!props.isPremium ? "effect-locked" : ""}`}>
            <div className="effect-preview" style={{ overflow: "visible" }}>
              <div className="ring-preview-wrap">
                <div className="ring-preview-shell rp-premium rp-glow"><div className="ring-preview-spin rp-spin-gold" /></div>
                <div className="ring-preview-inner" style={{ inset: 5 }} />
                <div className="ring-preview-avatar" />
                <div className="ring-preview-pulse" />
              </div>
            </div>
            <div className="effect-card-name">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" width="11" height="11"><circle cx="12" cy="12" r="10" /></svg>
              {t("Gold Ring")}
            </div>
            <div className="effect-card-desc">{t("Shimmering golden ring with outer glow and pulse animation")}</div>
            {props.isPremium ? (
              <div className="effect-toggle-wrap">
                <span className="effect-toggle-text">{ring === "premium" ? "Enabled" : "Disabled"}</span>
                <ToggleSwitch active={ring === "premium"} onClick={() => toggleRing("premium")} />
              </div>
            ) : (
              <div className="premium-ring-lock">
                <svg viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ color: "#fbbf24" }}><path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.35)" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" opacity=".8" /></svg>
                <span>{t("Infected Plus Only")}</span>
              </div>
            )}
          </div>

          {purchasedEffectGrid(AVATAR_IDS, "avatar")}
        </div>
      </div>

      <div className="fx-section">
        <div className="fx-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="12" cy="12" r="4" /></svg>
          {t("Profile Picture Shape")}
        </div>
        <div className="shape-grid">
          {SHAPES.map((s) => (
            <div key={s.key} className={`shape-card ${shape === s.key ? "selected" : ""}`} onClick={() => selectShape(s.key)}>
              <div className={`shape-preview ${s.cls}`} />
              <div className="shape-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      </>
      )}

      <div className={`unsaved-bar ${dirty ? "visible" : ""}`}>
        <span className="unsaved-bar-text">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          {t("You have unsaved changes!")}
        </span>
        <div className="unsaved-bar-actions">
          <button className="btn btn-secondary btn-sm" onClick={resetChanges}>{t("Reset")}</button>
          <button className="btn btn-primary btn-sm" onClick={saveChanges} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
        </div>
      </div>
    </>
  );
}
