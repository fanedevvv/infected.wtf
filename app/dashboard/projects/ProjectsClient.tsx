"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "@/lib/toast";
import { useT } from "@/lib/i18n/client";

type Project = {
  id: number;
  title: string;
  description: string | null;
  url: string | null;
  repoUrl: string | null;
  technologies: string | null;
  image: string | null;
  status: "pending" | "approved" | "rejected";
  rejectReason: string | null;
  createdAt: string;
};

const STATUS_COLORS: Record<Project["status"], string> = { pending: "#fbbf24", approved: "#34d399", rejected: "#f87171" };

export default function ProjectsClient() {
  const t = useT();
  const [projects, setProjects] = useState<Project[]>([]);
  const [maxPending, setMaxPending] = useState(5);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.success) return;
        setProjects(d.projects);
        setMaxPending(d.maxPending);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [reloadKey]);

  const count = (s: Project["status"]) => projects.filter((p) => p.status === s).length;
  const pending = count("pending");
  const freeSlots = Math.max(0, maxPending - pending);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/projects", { method: "POST", body: new FormData(e.currentTarget) });
      const data = await res.json();
      if (data.success) {
        showToast(t("Project submitted — it will appear on your profile once approved."), "success");
        formRef.current?.reset();
        setReloadKey((k) => k + 1);
      } else {
        showToast(t(data.error || "Something went wrong."), "error");
      }
    } catch {
      showToast(t("Network error. Please try again."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: Project) {
    if (!confirm(t("Delete this project?"))) return;
    const res = await fetch("/api/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) });
    const data = await res.json().catch(() => ({}));
    if (data.success) setProjects((prev) => prev.filter((x) => x.id !== p.id));
    else showToast(t(data.error || "Something went wrong."), "error");
  }

  const stats = [
    { label: t("Pending"), value: pending, color: STATUS_COLORS.pending, icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
    { label: t("Approved"), value: count("approved"), color: STATUS_COLORS.approved, icon: <polyline points="20 6 9 17 4 12" /> },
    { label: t("Rejected"), value: count("rejected"), color: STATUS_COLORS.rejected, icon: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> },
    { label: t("Free slots"), value: freeSlots, color: "var(--accent)", icon: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />, sub: t("max {n} pending", { n: maxPending }) },
  ];

  return (
    <div className="pj-page">
      <div className="section-header">
        <h2>{t("Projects")}</h2>
        <p>{t("Add a project. It shows on your profile once approved.")}</p>
      </div>

      <div className="pj-label">{t("Overview")}</div>
      <div className="pj-hero">
        <span className="pj-hero-chip">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
          {t("Total projects")}
        </span>
        <div className="pj-hero-num">{loading ? "–" : projects.length}</div>
        <div className="pj-hero-foot"><span className="pj-hero-pill">{pending}/{maxPending}</span> {t("pending slots used")}</div>
      </div>

      <div className="pj-stats">
        {stats.map((s) => (
          <div className="pj-stat" key={s.label}>
            <span className="pj-stat-icon" style={{ color: s.color, background: `color-mix(in srgb, ${s.color} 14%, transparent)` }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">{s.icon}</svg>
            </span>
            <span className="pj-stat-label">{s.label}</span>
            <span className="pj-stat-value">{loading ? "–" : s.value}</span>
            {s.sub && <span className="pj-stat-sub">{s.sub}</span>}
          </div>
        ))}
      </div>

      <div className="pj-label">{t("New project")}</div>
      <form className="dash-card pj-form" ref={formRef} onSubmit={submit}>
        <div className="pj-form-title">+ {t("Project details")}</div>
        <div className="form-group">
          <label>{t("Title")} *</label>
          <input name="title" className="form-control" maxLength={80} required />
        </div>
        <div className="form-group">
          <label>{t("Description")}</label>
          <textarea name="description" className="form-control" maxLength={1000} rows={4} />
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>{t("Project link")}</label>
            <input name="url" className="form-control" placeholder="https://..." maxLength={300} />
          </div>
          <div className="form-group">
            <label>{t("Repository link")}</label>
            <input name="repoUrl" className="form-control" placeholder="https://github.com/..." maxLength={300} />
          </div>
        </div>
        <div className="form-group">
          <label>{t("Technologies")}</label>
          <input name="technologies" className="form-control" placeholder="PHP, MySQL, JavaScript" maxLength={500} />
          <p className="pj-hint">{t("Comma separated, max 10.")}</p>
        </div>
        <div className="form-group">
          <label>{t("Image")}</label>
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="form-control" />
          <p className="pj-hint">{t("JPG, PNG or WEBP, max 2 MB.")}</p>
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || freeSlots === 0}>
          {busy ? t("Submitting…") : t("Submit project")}
        </button>
        {freeSlots === 0 && <p className="pj-hint" style={{ color: "#fbbf24" }}>{t("You have reached the limit of projects waiting for review.")}</p>}
      </form>

      <div className="dash-card">
        <div className="pj-form-title">☰ {t("Your projects")}</div>
        {!loading && projects.length === 0 && <p className="pj-empty">{t("You have not added any project yet.")}</p>}
        <div className="pj-list">
          {projects.map((p) => (
            <div className="pj-item" key={p.id}>
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="pj-item-img" src={`/${p.image}`} alt="" />
              ) : (
                <div className="pj-item-img pj-item-img--empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="22" height="22"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                </div>
              )}
              <div className="pj-item-body">
                <div className="pj-item-head">
                  <b>{p.title}</b>
                  <span className="pj-status" style={{ color: STATUS_COLORS[p.status], borderColor: `color-mix(in srgb, ${STATUS_COLORS[p.status]} 45%, transparent)` }}>
                    {t(p.status === "pending" ? "Pending" : p.status === "approved" ? "Approved" : "Rejected")}
                  </span>
                </div>
                {p.description && <p className="pj-item-desc">{p.description}</p>}
                {p.status === "rejected" && p.rejectReason && <p className="pj-item-reason">{t("Reason")}: {p.rejectReason}</p>}
                <div className="pj-item-foot">
                  {p.technologies && <span className="pj-item-tech">{p.technologies}</span>}
                  <button type="button" className="pj-delete" onClick={() => remove(p)}>{t("Delete")}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
