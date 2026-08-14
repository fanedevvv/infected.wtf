"use client";

import { useState } from "react";
import { showToast } from "@/lib/toast";

type Domain = { id: number; hostname: string; isDefault: boolean; tier: string };

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
);
const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.2 21 12 17.77 5.8 21 7 14.14l-5-4.87 7.1-1.01L12 2z" /></svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12" /></svg>
);

function DomainCard({
  domain, slug, isActive, isPremiumUser, busy, onToggle, onCopy,
}: {
  domain: Domain; slug: string; isActive: boolean; isPremiumUser: boolean; busy: boolean;
  onToggle: () => void; onCopy: () => void;
}) {
  const locked = domain.tier === "premium" && !isPremiumUser;

  return (
    <div className={`domain-card ${isActive ? "active" : ""} ${locked ? "locked" : ""}`}>
      {domain.tier === "premium" && (
        <span className="domain-card-badge"><StarIcon /> Premium</span>
      )}
      <div className="domain-card-icon"><LinkIcon /></div>
      <div>
        <div className="domain-card-name">{domain.hostname}</div>
        <div className="domain-card-sub">{domain.hostname}/{slug || "you"}</div>
      </div>

      {domain.isDefault ? (
        <button className="domain-card-btn domain-card-btn-active" disabled>
          <CheckIcon /> Active
        </button>
      ) : locked ? (
        <button className="domain-card-btn domain-card-btn-locked" disabled title="Available on Premium">
          <LockIcon /> Premium
        </button>
      ) : isActive ? (
        <div style={{ display: "flex", gap: ".4rem", width: "100%" }}>
          <button className="domain-card-btn domain-card-btn-active" style={{ flex: 1 }} onClick={onToggle} disabled={busy}>
            {busy ? "…" : (<><CheckIcon /> Active</>)}
          </button>
          <button className="domain-card-btn domain-card-btn-copy" onClick={onCopy} title="Copy link">⧉</button>
        </div>
      ) : (
        <button className="domain-card-btn domain-card-btn-select" onClick={onToggle} disabled={busy}>
          {busy ? "…" : "Select"}
        </button>
      )}
    </div>
  );
}

export default function DomainPicker({ slug, domains, initialSelected, max, isPremium }: { slug: string; domains: Domain[]; initialSelected: number[]; max: number; isPremium: boolean }) {
  const [selected, setSelected] = useState<Set<number>>(new Set(initialSelected));
  const [busyId, setBusyId] = useState<number | null>(null);

  async function toggle(domain: Domain) {
    const isSelected = selected.has(domain.id);
    if (!isSelected && selected.size >= max) {
      showToast(`You can only use up to ${max} domains at once.`, "error");
      return;
    }
    setBusyId(domain.id);
    try {
      const res = await fetch("/api/profile-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain_id: domain.id, select: !isSelected }),
      });
      const j = await res.json();
      if (j.success) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (isSelected) next.delete(domain.id);
          else next.add(domain.id);
          return next;
        });
        showToast(isSelected ? "Domain removed from your profile." : "Domain enabled for your profile!", "success");
      } else {
        showToast(j.error || "Error", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusyId(null);
    }
  }

  function copyLink(hostname: string) {
    navigator.clipboard.writeText(`https://${hostname}/${slug}`).then(
      () => showToast("Link copied!", "success"),
      () => showToast("Couldn't copy link.", "error")
    );
  }

  const freeDomains = domains.filter((d) => d.tier !== "premium");
  const premiumDomains = domains.filter((d) => d.tier === "premium");

  return (
    <>
      <div className="section-header">
        <h2>Links</h2>
        <p>Choose up to {max} domains your profile is reachable on — your page stays the same, just the link changes.</p>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title"><LinkIcon /> Free Domains</span>
          <span style={{ fontSize: ".78rem", color: "rgba(255,255,255,.4)" }}>Available to all users</span>
        </div>
        {freeDomains.length === 0 ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem", fontSize: ".875rem" }}>No free domains yet.</p>
        ) : (
          <div className="domain-grid">
            {freeDomains.map((d) => (
              <DomainCard
                key={d.id}
                domain={d}
                slug={slug}
                isActive={d.isDefault || selected.has(d.id)}
                isPremiumUser={isPremium}
                busy={busyId === d.id}
                onToggle={() => toggle(d)}
                onCopy={() => copyLink(d.hostname)}
              />
            ))}
          </div>
        )}
      </div>

      {premiumDomains.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title"><StarIcon /> Premium Domains</span>
            <span style={{ fontSize: ".78rem", color: "rgba(255,255,255,.4)" }}>Exclusive domains for premium users</span>
          </div>
          <div className="domain-grid">
            {premiumDomains.map((d) => (
              <DomainCard
                key={d.id}
                domain={d}
                slug={slug}
                isActive={selected.has(d.id)}
                isPremiumUser={isPremium}
                busy={busyId === d.id}
                onToggle={() => toggle(d)}
                onCopy={() => copyLink(d.hostname)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
