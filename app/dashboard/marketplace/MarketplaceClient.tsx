"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/lib/toast";
import EffectText from "@/components/EffectText";

type Theme = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  purchaseCount: number;
  creatorUsername: string;
  creatorAvatar: string | null;
  isOwner: boolean;
  owned: boolean;
  preview: {
    accentColor: string; backgroundColor: string; nameColor: string; bioColor: string; overlayColor: string;
    backgroundType: string; backgroundValue: string; nameEffect: string; bioEffect: string;
    avatarShape: string; particleEffect: boolean; cursorTrail: boolean; layoutTemplate: string;
  };
};

// Mini profile mock-up rendered with the theme's own settings, so buyers see the actual look.
function ThemePreview({ theme }: { theme: Theme }) {
  const p = theme.preview;
  const background = p.backgroundType === "color" || p.backgroundType === "gradient" ? p.backgroundValue : p.backgroundColor;
  const tags = [p.layoutTemplate, p.nameEffect !== "none" && `${p.nameEffect} name`, p.particleEffect && "particles", p.cursorTrail && "cursor trail"].filter(Boolean) as string[];

  return (
    <div className="theme-preview" style={{ background, ["--accent" as string]: p.accentColor }}>
      {p.particleEffect && <div className="theme-preview-particles" />}
      <div className="theme-preview-card" style={{ background: `color-mix(in srgb, ${p.overlayColor} 85%, transparent)` }}>
        <div className={`avatar-shape-${p.avatarShape}`}>
          {theme.creatorAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="avatar-img theme-preview-avatar" src={`/${theme.creatorAvatar}`} alt="" />
          ) : (
            <div className="avatar-img theme-preview-avatar" style={{ background: `linear-gradient(135deg, ${p.accentColor}, ${p.nameColor})` }}>
              {theme.creatorUsername.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="theme-preview-name" style={{ color: p.nameColor }}>
          <EffectText text={theme.creatorUsername} effect={p.nameEffect} active />
        </div>
        <div className="theme-preview-bio" style={{ color: p.bioColor }}>
          <EffectText text="welcome to my page" effect={p.bioEffect} active />
        </div>
        <div className="theme-preview-links">
          {[0, 1, 2].map((i) => <span key={i} />)}
        </div>
      </div>
      {tags.length > 0 && (
        <div className="theme-preview-tags">
          {tags.map((t) => <span key={t}>{t}</span>)}
        </div>
      )}
    </div>
  );
}

function PreviewButton({ themeId, profileSlug }: { themeId: number; profileSlug: string }) {
  return (
    <a className="int-btn int-btn-manage" href={`/${profileSlug}?previewTheme=${themeId}`} target="_blank" rel="noopener">Preview</a>
  );
}

function ThemeCard({ theme, onChange, tokens, profileSlug }: { theme: Theme; onChange: () => void; tokens: number; profileSlug: string }) {
  const [busy, setBusy] = useState(false);

  async function buy() {
    setBusy(true);
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "buy", themeId: theme.id }),
      });
      const j = await res.json();
      if (j.success) { showToast(`"${theme.name}" purchased!`, "success"); onChange(); }
      else showToast(j.error || "Error", "error");
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    setBusy(true);
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", themeId: theme.id }),
      });
      const j = await res.json();
      if (j.success) showToast(`"${theme.name}" applied to your profile!`, "success");
      else showToast(j.error || "Error", "error");
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="theme-card">
      <ThemePreview theme={theme} />
      <div className="theme-card-body">
        <div className="theme-card-name">{theme.name}</div>
        <div className="theme-card-creator">by @{theme.creatorUsername} · {theme.purchaseCount} sold</div>
        {theme.description && <p className="theme-card-desc">{theme.description}</p>}
        <div className="theme-card-footer">
          <PreviewButton themeId={theme.id} profileSlug={profileSlug} />
          {theme.owned ? (
            <button className="int-btn int-btn-manage" onClick={apply} disabled={busy}>Apply</button>
          ) : (
            <button className="int-btn int-btn-primary" style={{ ["--int-color" as string]: "#7c3aed" }} onClick={buy} disabled={busy || tokens < theme.price}>
              {busy ? "…" : `Buy — ${theme.price} tokens`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PublishModal({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(150);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function publish() {
    if (!name.trim()) { setError("Give your theme a name."); return; }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", name, description, price }),
      });
      const j = await res.json();
      if (j.success) {
        showToast(j.downgradedBackground ? "Published! (custom background/video not shared — replaced with particles)" : "Theme published!", "success");
        onPublished();
        onClose();
      } else {
        setError(j.error || "Error");
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#13131a", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: "1.5rem", width: "min(420px,95vw)", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: ".9rem", right: ".9rem", background: "rgba(255,255,255,.06)", border: "none", color: "#aaa", width: 28, height: 28, borderRadius: "50%", cursor: "pointer" }}>✕</button>
        <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>Publish your current look as a Theme</div>
        <div style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1.1rem" }}>Snapshots your colors, effects, font, layout &amp; player style. You earn 50% of every sale in tokens.</div>

        <div style={{ display: "flex", flexDirection: "column", gap: ".7rem" }}>
          <input className="form-control" placeholder="Theme name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <textarea className="form-control" placeholder="Short description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
          <div>
            <label style={{ fontSize: ".75rem", color: "var(--text-muted)", display: "block", marginBottom: ".3rem" }}>Price: {price} tokens</label>
            <input type="range" min={50} max={2000} step={10} value={price} onChange={(e) => setPrice(parseInt(e.target.value, 10))} style={{ width: "100%", accentColor: "var(--accent)" }} />
          </div>
        </div>
        {error && <div style={{ color: "#ff8080", fontSize: ".8rem", marginTop: ".6rem" }}>{error}</div>}
        <button onClick={publish} disabled={busy} className="btn btn-primary btn-full" style={{ marginTop: "1rem" }}>
          {busy ? "Publishing…" : "Publish Theme"}
        </button>
      </div>
    </div>
  );
}

export default function MarketplaceClient({ tokens: initialTokens, profileSlug }: { tokens: number; username: string; profileSlug: string }) {
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [myThemes, setMyThemes] = useState<Theme[]>([]);
  const [tokens, setTokens] = useState(initialTokens);
  const [publishOpen, setPublishOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadBrowse() {
    const res = await fetch("/api/marketplace");
    const j = await res.json();
    setThemes(j.themes || []);
  }
  async function loadMine() {
    const res = await fetch("/api/marketplace?mine=1");
    const j = await res.json();
    setMyThemes(j.themes || []);
  }
  async function refreshTokens() {
    const res = await fetch("/api/me");
    const j = await res.json();
    if (j.user) setTokens(j.user.tokens);
  }

  useEffect(() => {
    Promise.all([loadBrowse(), loadMine()]).finally(() => setLoading(false));
  }, []);

  async function refreshAll() {
    await Promise.all([loadBrowse(), loadMine(), refreshTokens()]);
  }

  async function unpublish(id: number) {
    if (!confirm("Unpublish this theme? It will no longer be sold, but past buyers keep it.")) return;
    const res = await fetch("/api/marketplace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unpublish", themeId: id }),
    });
    const j = await res.json();
    if (j.success) { showToast("Theme unpublished.", "success"); loadMine(); loadBrowse(); }
    else showToast(j.error || "Error", "error");
  }

  return (
    <>
      <div className="section-header" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2>Theme Marketplace</h2>
          <p>Buy and sell profile themes with other creators — earn 50% of every sale in tokens</p>
        </div>
        <button className="btn btn-primary" onClick={() => setPublishOpen(true)}>+ Publish current look</button>
      </div>

      <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.5rem" }}>
        <button className={`lb-tab-btn ${tab === "browse" ? "active" : ""}`} onClick={() => setTab("browse")}>Browse</button>
        <button className={`lb-tab-btn ${tab === "mine" ? "active" : ""}`} onClick={() => setTab("mine")}>My Themes ({myThemes.length})</button>
      </div>

      {!loading && tab === "browse" && (
        themes.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>No themes published yet — be the first!</p>
        ) : (
          <div className="theme-grid">
            {themes.map((t) => <ThemeCard key={t.id} theme={t} onChange={refreshAll} tokens={tokens} profileSlug={profileSlug} />)}
          </div>
        )
      )}

      {!loading && tab === "mine" && (
        myThemes.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>You haven&apos;t published any themes yet.</p>
        ) : (
          <div className="theme-grid">
            {myThemes.map((t) => (
              <div className="theme-card" key={t.id}>
                <ThemePreview theme={t} />
                <div className="theme-card-body">
                  <div className="theme-card-name">{t.name}</div>
                  <div className="theme-card-creator">{t.purchaseCount} sold · {t.purchaseCount * Math.floor(t.price / 2)} tokens earned</div>
                  <div className="theme-card-footer">
                    <PreviewButton themeId={t.id} profileSlug={profileSlug} />
                    <button className="int-btn int-btn-danger" onClick={() => unpublish(t.id)}>Unpublish</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {publishOpen && <PublishModal onClose={() => setPublishOpen(false)} onPublished={refreshAll} />}
    </>
  );
}
