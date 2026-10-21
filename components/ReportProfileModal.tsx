"use client";

import { useState } from "react";
import { REPORT_REASONS } from "@/lib/report-reasons";

export default function ReportProfileModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      setError("Pick a reason.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/profile-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, reason, details }),
      });
      const data = await res.json();
      if (data.success) setDone(true);
      else setError(data.error || "Something went wrong.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rp-modal" role="dialog" aria-modal="true" aria-labelledby="rp-title">
        <button type="button" className="rp-close" onClick={onClose} aria-label="Close">✕</button>
        {done ? (
          <div className="rp-done">
            <div className="rp-done-icon">✓</div>
            <h3>Thanks for the report</h3>
            <p>Our team will review @{slug} soon.</p>
            <button type="button" className="rp-btn rp-btn-primary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h3 id="rp-title">⚑ Report @{slug}</h3>
            <p className="rp-sub">Our team will review this profile.</p>
            <div className="rp-reasons">
              {Object.entries(REPORT_REASONS).map(([value, label]) => (
                <label key={value} className={`rp-reason ${reason === value ? "active" : ""}`}>
                  <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} />
                  {label}
                </label>
              ))}
            </div>
            <label className="rp-details-label" htmlFor="rp-details">Details <em>optional</em></label>
            <textarea id="rp-details" className="rp-details" rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Anything that helps us review it…" />
            {error && <div className="rp-error">{error}</div>}
            <div className="rp-actions">
              <button type="button" className="rp-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="rp-btn rp-btn-danger" disabled={busy}>{busy ? "Sending…" : "Send report"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
