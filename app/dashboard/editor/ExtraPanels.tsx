"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { showToast } from "@/lib/toast";
import { useT } from "@/lib/i18n/client";
import { EMBED_VARIABLES, applyEmbedVariables } from "@/lib/social-embed";

const SITE = "infected.wtf";

async function json<T = Record<string, unknown>>(res: Response): Promise<T> {
  return (await res.json().catch(() => ({}))) as T;
}

/* ───────────── Aliases ───────────── */

export function AliasesPanel({ slug }: { slug: string }) {
  const t = useT();
  const [aliases, setAliases] = useState<{ id: number; alias: string }[]>([]);
  const [limit, setLimit] = useState(3);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/profile-extras/aliases").then(json<{ success: boolean; aliases: { id: number; alias: string }[]; limit: number }>).then((d) => {
      if (d.success) { setAliases(d.aliases); setLimit(d.limit); }
    });
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    const res = await fetch("/api/profile-extras/aliases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alias: value }) });
    const d = await json<{ success: boolean; alias: { id: number; alias: string }; error?: string }>(res);
    setBusy(false);
    if (d.success) { setAliases((a) => [...a, d.alias]); setValue(""); showToast(t("Alias added"), "success"); }
    else showToast(t(d.error || "Something went wrong."), "error");
  }

  async function remove(id: number) {
    const res = await fetch("/api/profile-extras/aliases", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if ((await json<{ success: boolean }>(res)).success) setAliases((a) => a.filter((x) => x.id !== id));
  }

  return (
    <div className="dash-card">
      <p className="pe-panel-intro">{t("Aliases are extra names that redirect to {page}.", { page: `${SITE}/${slug}` })}</p>
      <form className="pe-inline-form" onSubmit={add}>
        <div className="pe-prefix-input">
          <span>{SITE}/</span>
          <input value={value} onChange={(e) => setValue(e.target.value.toLowerCase())} placeholder="alias" maxLength={30} />
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || aliases.length >= limit}>{t("Add")}</button>
      </form>
      <p className="pe-hint">{t("{used} of {limit} used · 3-30 characters: letters, numbers, _ . -", { used: aliases.length, limit })}</p>
      <div className="pe-chip-list">
        {aliases.map((a) => (
          <span className="pe-chip" key={a.id}>
            {SITE}/{a.alias}
            <button type="button" onClick={() => remove(a.id)} aria-label={t("Remove")}>✕</button>
          </span>
        ))}
        {aliases.length === 0 && <span className="pe-empty">{t("No aliases yet.")}</span>}
      </div>
    </div>
  );
}

/* ───────────── Best friend ───────────── */

type Friend = { slug: string; displayName: string; avatar: string | null };

export function BestFriendPanel({ onChange }: { onChange: () => void }) {
  const t = useT();
  const [friend, setFriend] = useState<Friend | null>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/profile-extras/best-friend").then(json<{ success: boolean; friend: Friend | null }>).then((d) => d.success && setFriend(d.friend));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    const res = await fetch("/api/profile-extras/best-friend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: value }) });
    const d = await json<{ success: boolean; friend: Friend; error?: string }>(res);
    setBusy(false);
    if (d.success) { setFriend(d.friend); setValue(""); onChange(); showToast(t("Best friend saved"), "success"); }
    else showToast(t(d.error || "Something went wrong."), "error");
  }

  async function clear() {
    await fetch("/api/profile-extras/best-friend", { method: "DELETE" });
    setFriend(null);
    onChange();
  }

  return (
    <div className="dash-card">
      <p className="pe-panel-intro">{t("Pick one profile to feature on your page. They'll get a notification.")}</p>
      {friend && (
        <div className="pe-friend">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={friend.avatar ? `/${friend.avatar}` : "/assets/img/default-avatar.png"} alt="" />
          <div>
            <b>{friend.displayName}</b>
            <span>{SITE}/{friend.slug}</span>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={clear}>{t("Remove")}</button>
        </div>
      )}
      <form className="pe-inline-form" onSubmit={save}>
        <div className="pe-prefix-input">
          <span>{SITE}/</span>
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="username" maxLength={60} />
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{friend ? t("Change") : t("Set")}</button>
      </form>
    </div>
  );
}

/* ───────────── Skills ───────────── */

type Skill = { name: string; level: number };

export function SkillsPanel({ onSaved }: { onSaved: () => void }) {
  const t = useT();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [max, setMax] = useState(20);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/profile-extras/skills").then(json<{ success: boolean; skills: Skill[]; max: number }>).then((d) => {
      if (d.success) { setSkills(d.skills); setMax(d.max); }
      setLoaded(true);
    });
  }, []);

  function update(i: number, patch: Partial<Skill>) {
    setSkills((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    setDirty(true);
  }
  function move(i: number, dir: -1 | 1) {
    setSkills((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
  }

  async function save() {
    setBusy(true);
    const res = await fetch("/api/profile-extras/skills", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skills }) });
    const d = await json<{ success: boolean; skills: Skill[]; error?: string }>(res);
    setBusy(false);
    if (d.success) { setSkills(d.skills); setDirty(false); onSaved(); showToast(t("Skills saved"), "success"); }
    else showToast(t(d.error || "Something went wrong."), "error");
  }

  return (
    <div className="dash-card">
      <p className="pe-panel-intro">{t("Skills show as bars on your profile. Drag the slider to set your level.")}</p>
      <div className="pe-skills">
        {skills.map((s, i) => (
          <div className="pe-skill" key={i}>
            <input className="form-control" value={s.name} maxLength={40} placeholder={t("Skill name")} onChange={(e) => update(i, { name: e.target.value })} />
            <input type="range" min={0} max={100} value={s.level} onChange={(e) => update(i, { level: parseInt(e.target.value, 10) })} />
            <span className="pe-skill-level">{s.level}%</span>
            <div className="pe-skill-actions">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t("Move up")}>↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === skills.length - 1} aria-label={t("Move down")}>↓</button>
              <button type="button" onClick={() => { setSkills((x) => x.filter((_, j) => j !== i)); setDirty(true); }} aria-label={t("Remove")}>✕</button>
            </div>
          </div>
        ))}
        {loaded && skills.length === 0 && <span className="pe-empty">{t("No skills yet.")}</span>}
      </div>
      <div className="pe-inline-form" style={{ marginTop: ".9rem" }}>
        <button type="button" className="btn btn-secondary btn-sm" disabled={skills.length >= max} onClick={() => { setSkills((s) => [...s, { name: "", level: 50 }]); setDirty(true); }}>
          + {t("Add skill")}
        </button>
        <button type="button" className="btn btn-primary btn-sm" disabled={!dirty || busy} onClick={save}>{busy ? t("Saving…") : t("Save skills")}</button>
      </div>
    </div>
  );
}

/* ───────────── Sharing ───────────── */

export function SharingPanel({ slug }: { slug: string }) {
  const t = useT();
  const url = `https://${SITE}/${slug}`;
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 360, margin: 1, color: { dark: "#000000", light: "#ffffff" } }).then(setQr).catch(() => setQr(null));
  }, [url]);

  const text = encodeURIComponent(t("Check out my page"));
  const enc = encodeURIComponent(url);
  const targets = [
    { name: "X", href: `https://twitter.com/intent/tweet?text=${text}&url=${enc}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc}` },
    { name: "WhatsApp", href: `https://wa.me/?text=${text}%20${enc}` },
    { name: "Telegram", href: `https://t.me/share/url?url=${enc}&text=${text}` },
    { name: "Reddit", href: `https://www.reddit.com/submit?url=${enc}&title=${text}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      showToast(t("Link copied!"), "success");
    } catch {
      showToast(t("Couldn't copy — select the link manually."), "error");
    }
  }

  return (
    <div className="dash-card">
      <div className="pe-share-link">
        <input readOnly value={url} onFocus={(e) => e.target.select()} />
        <button type="button" className="btn btn-primary btn-sm" onClick={copy}>{t("Copy")}</button>
      </div>

      <div className="pe-share-grid">
        <div className="pe-share-qr">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR" />
          ) : (
            <div className="pe-share-qr-empty" />
          )}
          {qr && <a className="btn btn-secondary btn-sm" href={qr} download={`${slug}-qr.png`}>{t("Download QR")}</a>}
        </div>
        <div className="pe-share-side">
          <div className="pe-side-label">{t("Share to")}</div>
          <div className="pe-share-targets">
            {targets.map((x) => (
              <a key={x.name} href={x.href} target="_blank" rel="noopener noreferrer" className="pe-share-target">{x.name}</a>
            ))}
          </div>
          <div className="pe-side-label" style={{ marginTop: "1rem" }}>{t("Embed card")}</div>
          <p className="pe-hint">{t("This is the card Discord and other apps show when you paste your link.")}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pe-share-og" src={`/${slug}/opengraph-image`} alt="" />
          <a className="btn btn-secondary btn-sm" href={`/${slug}/opengraph-image`} download={`${slug}-card.png`}>{t("Download card")}</a>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Social preview (Discord/Twitter embed) ───────────── */

type EmbedState = {
  enabled: boolean;
  title: string;
  description: string;
  colorMode: "page" | "custom" | "none";
  colorCustom: string;
};

export function SocialEmbedPanel({
  isPremium, username, displayName, bio, views, accentColor, avatar,
}: {
  isPremium: boolean;
  username: string;
  displayName: string;
  bio: string;
  views: number;
  accentColor: string;
  avatar: string | null;
}) {
  const t = useT();
  const [state, setState] = useState<EmbedState>({ enabled: false, title: "", description: "", colorMode: "page", colorCustom: accentColor });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/social-embed").then(json<{ success: boolean; embed?: Record<string, unknown> }>).then((d) => {
      if (d.success && d.embed) {
        setState({
          enabled: !!d.embed.socialEmbedEnabled,
          title: (d.embed.socialEmbedTitle as string) || "",
          description: (d.embed.socialEmbedDescription as string) || "",
          colorMode: ((d.embed.socialEmbedColorMode as string) || "page") as EmbedState["colorMode"],
          colorCustom: (d.embed.socialEmbedColorCustom as string) || accentColor,
        });
      }
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (state.enabled && !isPremium) {
      showToast(t("Custom social previews are an Infected Plus feature."), "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/social-embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: state.enabled, title: state.title, description: state.description,
          colorMode: state.colorMode, colorCustom: state.colorCustom,
        }),
      });
      const d = await json<{ success: boolean; error?: string }>(res);
      if (d.success) showToast(t("Saved! Discord/Twitter may cache the old preview for a bit."), "success");
      else showToast(d.error || t("Error"), "error");
    } finally {
      setSaving(false);
    }
  }

  const previewData = { username, displayName, bio, views };
  const previewTitle = applyEmbedVariables(state.title || displayName, previewData);
  const previewDesc = applyEmbedVariables(state.description || bio || `@${username} on infected.wtf`, previewData);
  const previewColor = state.colorMode === "none" ? "rgba(255,255,255,.15)" : state.colorMode === "custom" ? state.colorCustom : accentColor;

  if (loading) return <div className="dash-card"><p className="pe-hint">{t("Loading…")}</p></div>;

  return (
    <div className="dash-card">
      <div className="se-head">
        <div>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>{t("Social preview")}</h3>
          <p className="pe-hint" style={{ margin: ".2rem 0 0" }}>{t("Customize the card Discord and other apps show when your link is pasted.")}</p>
        </div>
        {!isPremium && <span className="template-card-badge pro">{t("PRO")}</span>}
      </div>

      <label className="se-toggle-row">
        <span>{t("Use a custom social preview")}</span>
        <span className={`se-toggle ${state.enabled ? "on" : ""}`} onClick={() => setState((s) => ({ ...s, enabled: !s.enabled }))}>
          <span className="se-toggle-dot" />
        </span>
      </label>

      {state.enabled && (
        <>
          <div className="form-group">
            <label>{t("Title")}</label>
            <input className="form-control" value={state.title} placeholder={displayName} maxLength={100} onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>{t("Description")}</label>
            <textarea className="form-control" rows={2} value={state.description} placeholder={bio || `@${username} on infected.wtf`} maxLength={300} onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))} />
          </div>
          <div className="se-vars">
            {EMBED_VARIABLES.map((v) => (
              <button key={v.token} type="button" className="se-var-chip" title={v.desc} onClick={() => setState((s) => ({ ...s, description: s.description + v.token }))}>
                {v.token}
              </button>
            ))}
          </div>

          <label style={{ display: "block", marginTop: "1rem" }}>{t("Accent color")}</label>
          <div className="se-color-modes">
            {(["page", "custom", "none"] as const).map((m) => (
              <button key={m} type="button" className={`se-color-mode-btn ${state.colorMode === m ? "active" : ""}`} onClick={() => setState((s) => ({ ...s, colorMode: m }))}>
                {m === "page" ? t("Page colour") : m === "custom" ? t("Custom") : t("None")}
              </button>
            ))}
            {state.colorMode === "custom" && (
              <input type="color" value={state.colorCustom} onChange={(e) => setState((s) => ({ ...s, colorCustom: e.target.value }))} className="se-color-input" />
            )}
          </div>
        </>
      )}

      <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: "1.2rem" }} disabled={saving} onClick={save}>
        {saving ? t("Saving…") : t("Save changes")}
      </button>

      <div className="se-preview-label">{t("Live preview")}</div>
      <div className="se-discord-card" style={{ borderLeftColor: previewColor }}>
        <div className="se-discord-site">infected.wtf</div>
        <div className="se-discord-title" style={{ color: previewColor === "rgba(255,255,255,.15)" ? "#fff" : previewColor }}>{previewTitle}</div>
        <div className="se-discord-desc">{previewDesc}</div>
        <div className="se-discord-footer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar ? `/${avatar}` : "/assets/img/default-avatar.png"} alt="" />
          <span>INFECTED.WTF</span>
        </div>
      </div>
    </div>
  );
}
