"use client";

import { useState } from "react";
import { showToast } from "@/lib/toast";
import { PLATFORMS, PLATFORM_COLOR, PLATFORM_ICON, PLATFORM_PLACEHOLDER } from "@/lib/social-platforms";

type Link = { id: number; platform: string; url: string };

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function LinksManager({ initialLinks }: { initialLinks: Link[] }) {
  const [links, setLinks] = useState<Link[]>(initialLinks);
  const [modalPlatform, setModalPlatform] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteVisible, setDeleteVisible] = useState(false);

  function openModal(platform: string) {
    setModalPlatform(platform);
    setUrlInput("");
    setError("");
  }
  function closeModal() {
    setModalPlatform(null);
  }

  async function saveLink() {
    if (!modalPlatform) return;
    let url = urlInput.trim();
    if (!url) {
      setError("Please enter a URL or username.");
      return;
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      if (url.startsWith("@")) url = url.slice(1);
      url = "https://" + url;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: modalPlatform, url }),
      });
      const j = await res.json();
      if (j.success) {
        setLinks((l) => [...l, { id: j.link.id, platform: j.link.platform, url: j.link.url }]);
        closeModal();
        showToast("Link added!", "success");
      } else {
        setError(j.error || "Failed to add link.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function askDelete(id: number) {
    setDeleteId(id);
    requestAnimationFrame(() => setDeleteVisible(true));
  }
  function cancelDelete() {
    setDeleteVisible(false);
    setTimeout(() => setDeleteId(null), 200);
  }
  async function confirmDelete() {
    if (!deleteId) return;
    const id = deleteId;
    cancelDelete();
    try {
      const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
      const j = await res.json();
      if (j.success) {
        setLinks((l) => l.filter((x) => x.id !== id));
        showToast("Link deleted!", "success");
      } else {
        showToast(j.error || "Error", "error");
      }
    } catch {
      showToast("Error", "error");
    }
  }

  const modalColor = modalPlatform ? PLATFORM_COLOR[modalPlatform] : "#6366f1";

  return (
    <>
      <div className="section-header"><h2>Social Links</h2><p>Add your social network links</p></div>

      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
            My Links
          </span>
        </div>
        {links.length === 0 ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem", fontSize: ".875rem" }}>You haven&apos;t added any links yet.</p>
        ) : (
          links.map((link) => (
            <div className="social-link-row" key={link.id}>
              <div className="social-link-icon" style={{ background: `${PLATFORM_COLOR[link.platform]}20`, border: `1px solid ${PLATFORM_COLOR[link.platform]}40` }}>
                <div style={{ color: PLATFORM_COLOR[link.platform], width: 20, height: 20 }}>{PLATFORM_ICON[link.platform] || PLATFORM_ICON.website}</div>
              </div>
              <div className="social-link-info">
                <div className="social-link-platform">{cap(link.platform)}</div>
                <div className="social-link-url">{link.url}</div>
              </div>
              <button onClick={() => askDelete(link.id)} className="btn btn-danger btn-sm">✕</button>
            </div>
          ))
        )}
      </div>

      <div className="dash-card">
        <div className="dash-card-header"><span className="dash-card-title">Add new link</span></div>
        <p style={{ color: "rgba(255,255,255,.38)", fontSize: ".8rem", margin: "0 0 1.25rem" }}>Select a platform to add your link or username.</p>
        <div className="link-platform-grid">
          {PLATFORMS.map((p) => {
            const color = PLATFORM_COLOR[p];
            return (
              <button key={p} className="link-platform-btn" onClick={() => openModal(p)} style={{ ["--lpb-color" as string]: color }}>
                <div className="lpb-icon" style={{ background: `${color}20`, border: `1px solid ${color}30`, color }}>
                  {PLATFORM_ICON[p]}
                </div>
                {cap(p)}
              </button>
            );
          })}
        </div>
      </div>

      <div id="link-modal" className={modalPlatform ? "open" : ""} role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && closeModal()}>
        <div className="link-modal-box" style={{ ["--lm-color" as string]: modalColor, borderColor: `${modalColor}30` }}>
          <button className="link-modal-close" onClick={closeModal}>×</button>
          {modalPlatform && (
            <>
              <div className="link-modal-header">
                <div className="link-modal-icon" style={{ background: `${modalColor}20`, border: `1px solid ${modalColor}35`, color: modalColor }}>
                  {PLATFORM_ICON[modalPlatform]}
                </div>
                <div>
                  <p className="link-modal-title">Link {cap(modalPlatform)}</p>
                  <p className="link-modal-sub">Enter your {cap(modalPlatform)} profile link or username.</p>
                </div>
              </div>
              <label className="link-modal-label" htmlFor="lm-url-input">Username / URL</label>
              <input
                id="lm-url-input"
                type="text"
                className="link-modal-input"
                placeholder={PLATFORM_PLACEHOLDER[modalPlatform]}
                autoComplete="off"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveLink()}
                style={{ ["--lm-color" as string]: `${modalColor}80` }}
              />
              {error && <div className="link-modal-err">{error}</div>}
              <button className="link-modal-btn" disabled={saving} onClick={saveLink}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12" /></svg>
                {saving ? "Adding..." : "Add link"}
              </button>
            </>
          )}
        </div>
      </div>

      {deleteId !== null && (
        <div className={`dlm-overlay ${deleteVisible ? "dlm-visible" : ""}`} onClick={(e) => e.target === e.currentTarget && cancelDelete()}>
          <div className="dlm-box">
            <div className="dlm-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
            </div>
            <p className="dlm-title">Delete this link?</p>
            <p className="dlm-sub">This action cannot be undone.</p>
            <div className="dlm-actions">
              <button className="dlm-btn dlm-cancel" onClick={cancelDelete}>Cancel</button>
              <button className="dlm-btn dlm-confirm" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
