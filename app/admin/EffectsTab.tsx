"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "@/lib/toast";

type Effect = { id: number; name: string; description: string | null; rarity: string; price: number; file: string; kind: string; enabled: boolean };

const RARITIES = ["common", "rare", "epic", "legendary", "mythic"];
const EMPTY = { id: null as number | null, name: "", description: "", rarity: "epic", price: "500" };

/** Admin: upload your own profile effects (animated WebP/GIF/APNG or WebM) and sell them in the Collectibles shop. */
export default function EffectsTab() {
  const [effects, setEffects] = useState<Effect[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [preview, setPreview] = useState<{ url: string; video: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin-effects")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) { if (d.success) setEffects(d.effects); else showToast(d.error || "Error", "error"); } })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [reloadKey]);

  function reset() {
    setForm(EMPTY);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function edit(e: Effect) {
    setForm({ id: e.id, name: e.name, description: e.description || "", rarity: e.rarity, price: String(e.price) });
    setPreview({ url: `/${e.file}`, video: e.kind === "video" });
    if (fileRef.current) fileRef.current.value = "";
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy) return;
    setBusy(true);
    const fd = new FormData();
    if (form.id) fd.append("id", String(form.id));
    fd.append("name", form.name);
    fd.append("description", form.description);
    fd.append("rarity", form.rarity);
    fd.append("price", form.price);
    const file = fileRef.current?.files?.[0];
    if (file) fd.append("file", file);
    try {
      const d = await fetch("/api/admin-effects", { method: "POST", body: fd }).then((r) => r.json());
      if (d.success) { showToast(form.id ? "Effect updated" : "Effect added to the shop", "success"); reset(); setReloadKey((k) => k + 1); }
      else showToast(d.error || "Error", "error");
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(e: Effect) {
    const d = await fetch("/api/admin-effects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: e.id, action: "toggle" }) }).then((r) => r.json()).catch(() => ({}));
    if (d.success) setReloadKey((k) => k + 1); else showToast(d.error || "Error", "error");
  }

  async function remove(e: Effect) {
    if (!confirm(`Delete "${e.name}"? People who bought it will lose it.`)) return;
    const d = await fetch("/api/admin-effects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: e.id }) }).then((r) => r.json()).catch(() => ({}));
    if (d.success) { if (form.id === e.id) reset(); setReloadKey((k) => k + 1); } else showToast(d.error || "Error", "error");
  }

  const media = (url: string, video: boolean) => video
    ? <video src={url} autoPlay muted loop playsInline />
    // eslint-disable-next-line @next/next/no-img-element -- uploaded effect
    : <img src={url} alt="" />;

  return (
    <div className="admin-tab-panel">
      <div className="dash-card" ref={formRef}>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: ".25rem" }}>{form.id ? "Edit profile effect" : "Add a profile effect"}</h3>
        <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
          Upload an animation with a transparent background — <b>animated WebP, GIF, APNG</b> or <b>WebM</b>, up to 15 MB. It plays stretched over the
          profile card (best around <b>450×880</b>, the shape of a profile card), and goes on sale in Dashboard → Collectibles → Profile effects.
          Only upload art you made or have the rights to.
        </p>
        <form onSubmit={save} className="pt-form">
          <label className="fx-admin-pick" title="Choose the effect file">
            {preview ? media(preview.url, preview.video) : <span>+ Effect file</span>}
            <input
              ref={fileRef} type="file" hidden accept="image/webp,image/gif,image/png,video/webm"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setPreview({ url: URL.createObjectURL(f), video: f.type.startsWith("video/") }); }}
            />
          </label>
          <div className="pt-fields">
            <input className="form-control" placeholder="Name" value={form.name} maxLength={60} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <textarea className="form-control" placeholder="Short description" value={form.description} maxLength={200} rows={2} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              <select className="form-control" style={{ flex: "1 1 8rem" }} value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value })}>
                {RARITIES.map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
              </select>
              <input className="form-control" style={{ flex: "1 1 8rem" }} type="number" min={0} max={1000000} placeholder="Price (tokens)" value={form.price} required onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: ".5rem" }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? "Uploading…" : form.id ? "Save changes" : "Add to shop"}</button>
              {form.id && <button type="button" className="btn btn-secondary btn-sm" onClick={reset}>Cancel</button>}
            </div>
          </div>
        </form>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>Loading…</p>
      ) : effects.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>No uploaded effects yet.</p>
      ) : (
        <div className="ar-list">
          {effects.map((e) => (
            <div className="ar-item pt-item" key={e.id} style={{ opacity: e.enabled ? 1 : 0.55 }}>
              <span className="fx-admin-thumb">{media(`/${e.file}`, e.kind === "video")}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{e.name}</b>{!e.enabled && <span className="pt-hidden">Hidden</span>}
                <div className="ar-meta" style={{ marginTop: ".15rem" }}>{e.rarity} · {e.price.toLocaleString()} tokens · {e.kind === "video" ? "WebM" : e.file.split(".").pop()?.toUpperCase()}</div>
                {e.description && <p className="ar-details" style={{ marginTop: ".35rem" }}>{e.description}</p>}
              </div>
              <div className="pt-actions">
                <button className="int-btn int-btn-manage" onClick={() => edit(e)}>Edit</button>
                <button className="int-btn int-btn-manage" onClick={() => toggle(e)}>{e.enabled ? "Hide" : "Show"}</button>
                <button className="int-btn int-btn-danger" onClick={() => remove(e)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
