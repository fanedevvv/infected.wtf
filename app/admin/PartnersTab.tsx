"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "@/lib/toast";

type Partner = { id: number; name: string; description: string | null; image: string | null; url: string; displayOrder: number; active: boolean };

const EMPTY = { id: null as number | null, name: "", description: "", url: "" };

export default function PartnersTab() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin-partners")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) setPartners(d.partners);
        else showToast(d.error || "Error", "error");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [reloadKey]);

  function reset() {
    setForm(EMPTY);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function edit(p: Partner) {
    setForm({ id: p.id, name: p.name, description: p.description || "", url: p.url });
    setPreview(p.image ? `/${p.image}` : null);
    if (fileRef.current) fileRef.current.value = "";
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const fd = new FormData();
    if (form.id) fd.append("id", String(form.id));
    fd.append("name", form.name);
    fd.append("description", form.description);
    fd.append("url", form.url);
    const file = fileRef.current?.files?.[0];
    if (file) fd.append("image", file);
    try {
      const res = await fetch("/api/admin-partners", { method: "POST", body: fd });
      const d = await res.json();
      if (d.success) {
        showToast(form.id ? "Partner updated" : "Partner added", "success");
        reset();
        setReloadKey((k) => k + 1);
      } else {
        showToast(d.error || "Error", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusy(false);
    }
  }

  async function act(p: Partner, action: "toggle" | "up" | "down") {
    const res = await fetch("/api/admin-partners", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, action }) });
    const d = await res.json().catch(() => ({}));
    if (d.success) setReloadKey((k) => k + 1);
    else showToast(d.error || "Error", "error");
  }

  async function remove(p: Partner) {
    if (!confirm(`Delete partner "${p.name}"?`)) return;
    const res = await fetch("/api/admin-partners", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) });
    const d = await res.json().catch(() => ({}));
    if (d.success) {
      if (form.id === p.id) reset();
      setReloadKey((k) => k + 1);
    } else {
      showToast(d.error || "Error", "error");
    }
  }

  return (
    <div className="admin-tab-panel">
      <div className="dash-card" ref={formRef}>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: ".25rem" }}>{form.id ? "Edit partner" : "Add a partner"}</h3>
        <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
          Partners show on <a href="/partners" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>infected.wtf/partners</a> in the order below.
        </p>
        <form onSubmit={save} className="pt-form">
          <label className="pt-pic" title="Choose a picture">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" />
            ) : (
              <span>+ Picture</span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPreview(URL.createObjectURL(f));
              }}
            />
          </label>
          <div className="pt-fields">
            <input className="form-control" placeholder="Name" value={form.name} maxLength={80} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="form-control" placeholder="https://link-to-partner…" value={form.url} maxLength={300} required onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <textarea className="form-control" placeholder="Short description" value={form.description} maxLength={500} rows={3} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div style={{ display: "flex", gap: ".5rem" }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? "Saving…" : form.id ? "Save changes" : "Add partner"}</button>
              {form.id && <button type="button" className="btn btn-secondary btn-sm" onClick={reset}>Cancel</button>}
            </div>
          </div>
        </form>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>Loading…</p>
      ) : partners.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>No partners yet.</p>
      ) : (
        <div className="ar-list">
          {partners.map((p, i) => (
            <div className="ar-item pt-item" key={p.id} style={{ opacity: p.active ? 1 : 0.55 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image ? `/${p.image}` : "/assets/img/default-avatar.png"} alt="" className="pt-thumb" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{p.name}</b>{!p.active && <span className="pt-hidden">Hidden</span>}
                <div className="ar-meta" style={{ marginTop: ".15rem" }}><a href={p.url} target="_blank" rel="noopener" style={{ color: "inherit" }}>{p.url}</a></div>
                {p.description && <p className="ar-details" style={{ marginTop: ".35rem" }}>{p.description}</p>}
              </div>
              <div className="pt-actions">
                <button className="int-btn int-btn-manage" disabled={i === 0} onClick={() => act(p, "up")} aria-label="Move up">↑</button>
                <button className="int-btn int-btn-manage" disabled={i === partners.length - 1} onClick={() => act(p, "down")} aria-label="Move down">↓</button>
                <button className="int-btn int-btn-manage" onClick={() => edit(p)}>Edit</button>
                <button className="int-btn int-btn-manage" onClick={() => act(p, "toggle")}>{p.active ? "Hide" : "Show"}</button>
                <button className="int-btn int-btn-danger" onClick={() => remove(p)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
