"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/lib/toast";
import { REPORT_REASONS } from "@/lib/report-reasons";

type Status = "open" | "resolved" | "dismissed";

type Report = {
  id: number;
  reason: string;
  details: string | null;
  status: Status;
  createdAt: string;
  resolvedAt: string | null;
  reporter: string | null;
  profile: { slug: string; displayName: string; avatar: string | null; userId: number; username: string; banned: boolean };
};

export default function ReportsTab({ onOpenCount }: { onOpenCount: (n: number) => void }) {
  const [status, setStatus] = useState<Status>("open");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin-reports?status=${status}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) {
          setReports(data.reports);
          onOpenCount(data.openCount);
        } else {
          showToast(data.error || "Error", "error");
        }
      })
      .catch(() => !cancelled && showToast("Network error", "error"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [status, reloadKey, onOpenCount]);

  async function setReportStatus(id: number, next: Status) {
    const res = await fetch("/api/admin-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.success) {
      showToast(next === "open" ? "Report reopened" : `Report ${next}`, "success");
      setReports((prev) => prev.filter((r) => r.id !== id));
      setReloadKey((k) => k + 1);
    } else {
      showToast(data.error || "Error", "error");
    }
  }

  return (
    <div className="admin-tab-panel">
      <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.25rem" }}>
        {(["open", "resolved", "dismissed"] as Status[]).map((s) => (
          <button key={s} className={`lb-tab-btn ${status === s ? "active" : ""}`} onClick={() => { setLoading(true); setStatus(s); }}>
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>Loading…</p>
      ) : reports.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>No {status} reports.</p>
      ) : (
        <div className="ar-list">
          {reports.map((r) => (
            <div className="ar-item" key={r.id}>
              <div className="ar-head">
                <a href={`/${r.profile.slug}`} target="_blank" rel="noopener" className="ar-profile">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.profile.avatar ? `/${r.profile.avatar}` : "/assets/img/default-avatar.png"} alt="" />
                  <span>
                    <b>{r.profile.displayName}</b>
                    <small>@{r.profile.slug} · user @{r.profile.username}{r.profile.banned ? " · banned" : ""}</small>
                  </span>
                </a>
                <span className="ar-reason">{REPORT_REASONS[r.reason] || r.reason}</span>
              </div>
              {r.details && <p className="ar-details">{r.details}</p>}
              <div className="ar-meta">
                #{r.id} · by {r.reporter ? `@${r.reporter}` : "guest"} · {new Date(r.createdAt).toLocaleString()}
              </div>
              <div className="ar-actions">
                <a className="int-btn int-btn-manage" href={`/admin?q=${encodeURIComponent(r.profile.username)}`}>Find user</a>
                {r.status === "open" ? (
                  <>
                    <button className="int-btn int-btn-primary" style={{ ["--int-color" as string]: "#16a34a" }} onClick={() => setReportStatus(r.id, "resolved")}>Resolve</button>
                    <button className="int-btn int-btn-danger" onClick={() => setReportStatus(r.id, "dismissed")}>Dismiss</button>
                  </>
                ) : (
                  <button className="int-btn int-btn-manage" onClick={() => setReportStatus(r.id, "open")}>Reopen</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
