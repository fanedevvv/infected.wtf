"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/lib/toast";

type Status = "pending" | "approved" | "rejected";

type Project = {
  id: number;
  title: string;
  description: string | null;
  url: string | null;
  repoUrl: string | null;
  technologies: string | null;
  image: string | null;
  status: Status;
  rejectReason: string | null;
  createdAt: string;
  profile: { slug: string; displayName: string; username: string };
};

export default function ProjectsReviewTab({ onPendingCount }: { onPendingCount: (n: number) => void }) {
  const [status, setStatus] = useState<Status>("pending");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin-projects?status=${status}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) {
          setProjects(d.projects);
          onPendingCount(d.pendingCount);
        } else {
          showToast(d.error || "Error", "error");
        }
      })
      .catch(() => !cancelled && showToast("Network error", "error"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [status, reloadKey, onPendingCount]);

  async function review(p: Project, next: Status) {
    let reason = "";
    if (next === "rejected") {
      const r = prompt(`Reason for rejecting "${p.title}" (optional):`);
      if (r === null) return;
      reason = r;
    }
    const res = await fetch("/api/admin-projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, status: next, reason }),
    });
    const d = await res.json().catch(() => ({}));
    if (d.success) {
      showToast(`Project ${next}`, "success");
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
      setReloadKey((k) => k + 1);
    } else {
      showToast(d.error || "Error", "error");
    }
  }

  return (
    <div className="admin-tab-panel">
      <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.25rem" }}>
        {(["pending", "approved", "rejected"] as Status[]).map((s) => (
          <button key={s} className={`lb-tab-btn ${status === s ? "active" : ""}`} onClick={() => { setLoading(true); setStatus(s); }}>
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>Loading…</p>
      ) : projects.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>No {status} projects.</p>
      ) : (
        <div className="ar-list">
          {projects.map((p) => (
            <div className="ar-item" key={p.id}>
              <div style={{ display: "flex", gap: ".9rem", flexWrap: "wrap" }}>
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/${p.image}`} alt="" style={{ width: 160, height: 100, objectFit: "cover", borderRadius: 10, background: "#111" }} />
                )}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div className="ar-head">
                    <b style={{ fontSize: ".95rem" }}>{p.title}</b>
                    <a href={`/${p.profile.slug}`} target="_blank" rel="noopener" style={{ fontSize: ".75rem", color: "var(--accent)" }}>@{p.profile.slug}</a>
                  </div>
                  {p.description && <p className="ar-details">{p.description}</p>}
                  <div className="ar-meta">
                    {p.technologies && <>Tech: {p.technologies} · </>}
                    {p.url && <><a href={p.url} target="_blank" rel="noopener nofollow" style={{ color: "inherit" }}>link</a> · </>}
                    {p.repoUrl && <><a href={p.repoUrl} target="_blank" rel="noopener nofollow" style={{ color: "inherit" }}>repo</a> · </>}
                    #{p.id} · {new Date(p.createdAt).toLocaleString()}
                  </div>
                  {p.rejectReason && <div className="ar-meta" style={{ color: "#fca5a5" }}>Reason: {p.rejectReason}</div>}
                </div>
              </div>
              <div className="ar-actions">
                {p.status !== "approved" && (
                  <button className="int-btn int-btn-primary" style={{ ["--int-color" as string]: "#16a34a" }} onClick={() => review(p, "approved")}>Approve</button>
                )}
                {p.status !== "rejected" && <button className="int-btn int-btn-danger" onClick={() => review(p, "rejected")}>Reject</button>}
                {p.status !== "pending" && <button className="int-btn int-btn-manage" onClick={() => review(p, "pending")}>Back to pending</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
