"use client";

import { useState } from "react";
import type { useRouter } from "next/navigation";
import { showToast } from "@/lib/toast";
import { ALL_BADGES } from "@/lib/badge-defs";
import { SHOP_EFFECTS } from "@/lib/shop";

type Bundle = { id: number; name: string; price: number; priceType: "euro" | "tokens"; badges: string[]; effects: string[]; premiumDays: number };

const MANAGEABLE_BADGES = ["verified", "champion", "known", "rich", "trapstar", "the_killer", "crew", "billionaire", "content_creator", "designer"];

interface Props {
  bundles: Bundle[];
  whitelistEnabled: boolean;
  x2Enabled: boolean;
  wlLoading: boolean;
  x2Loading: boolean;
  toggleWhitelist: () => void;
  toggleX2: () => void;
  router: ReturnType<typeof useRouter>;
  showConfirmFn: (title: string, text: string, btnLabel: string, cb: () => void) => void;
}

export default function OwnerTab({ bundles, whitelistEnabled, x2Enabled, wlLoading, x2Loading, toggleWhitelist, toggleX2, router, showConfirmFn }: Props) {
  // ── Infected Mail ──
  const [mailTitle, setMailTitle] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [mailRecipient, setMailRecipient] = useState("all");
  const [mailAuthor, setMailAuthor] = useState("Infected Team");
  const [mailStatus, setMailStatus] = useState<{ text: string; color: string } | null>(null);
  const [mailSending, setMailSending] = useState(false);

  async function sendInfectedMail() {
    if (!mailTitle.trim() || !mailBody.trim()) {
      setMailStatus({ text: "✗ Title and description are required.", color: "#ff8080" });
      return;
    }
    setMailSending(true);
    setMailStatus({ text: "Sending...", color: "rgba(255,255,255,.45)" });
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "infected_mail", title: mailTitle.trim(), body: mailBody.trim(), recipient: mailRecipient, author: mailAuthor.trim() }),
      });
      const j = await res.json();
      if (j.success) {
        setMailStatus({ text: `✓ Sent to ${j.sent} user(s)!`, color: "#4ade80" });
        setMailTitle(""); setMailBody(""); setMailAuthor("Infected Team");
      } else {
        setMailStatus({ text: `✗ ${j.error || "Unknown error"}`, color: "#ff8080" });
      }
    } catch {
      setMailStatus({ text: "✗ Network error", color: "#ff8080" });
    }
    setMailSending(false);
    setTimeout(() => setMailStatus(null), 5000);
  }

  // ── Bundles ──
  const [bName, setBName] = useState("");
  const [bPrice, setBPrice] = useState("");
  const [bPriceType, setBPriceType] = useState<"euro" | "tokens">("euro");
  const [bPremiumDays, setBPremiumDays] = useState("0");
  const [bBadges, setBBadges] = useState<Set<string>>(new Set());
  const [bEffects, setBEffects] = useState<Set<string>>(new Set());
  const [bStatus, setBStatus] = useState<{ text: string; color: string } | null>(null);
  const [bCreating, setBCreating] = useState(false);

  function toggleSet(set: Set<string>, setter: (s: Set<string>) => void, val: string) {
    const next = new Set(set);
    if (next.has(val)) next.delete(val); else next.add(val);
    setter(next);
  }

  async function bundleCreate() {
    const name = bName.trim();
    if (!name) { setBStatus({ text: "✗ Bundle name is required.", color: "#ff8080" }); return; }
    setBCreating(true);
    setBStatus({ text: "Creating...", color: "rgba(255,255,255,.45)" });
    try {
      const res = await fetch("/api/admin_action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_bundle", name, price: parseFloat(bPrice) || 0, price_type: bPriceType, premium_days: parseInt(bPremiumDays) || 0, badges: Array.from(bBadges), effects: Array.from(bEffects) }),
      });
      const data = await res.json();
      if (data.success) {
        setBStatus({ text: "✓ Bundle created!", color: "#4ade80" });
        showToast(`Bundle "${name}" created!`, "success");
        setBName(""); setBPrice(""); setBPremiumDays("0"); setBBadges(new Set()); setBEffects(new Set());
        router.refresh();
        setTimeout(() => setBStatus(null), 4000);
      } else {
        setBStatus({ text: `✗ ${data.error || "Failed"}`, color: "#ff8080" });
      }
    } catch {
      setBStatus({ text: "✗ Network error", color: "#ff8080" });
    }
    setBCreating(false);
  }

  function bundleDelete(bundleId: number) {
    showConfirmFn("Delete Bundle", "This bundle will be permanently removed. Users who already received rewards keep them.", "Delete", async () => {
      try {
        const res = await fetch("/api/admin_action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_bundle", bundle_id: bundleId }) });
        const data = await res.json();
        if (data.success) { showToast("Bundle deleted.", "success"); router.refresh(); }
        else showToast(data.error || "Failed to delete", "error");
      } catch { showToast("Network error", "error"); }
    });
  }

  // ── Apply bundle modal ──
  const [applyBundle, setApplyBundle] = useState<Bundle | null>(null);
  const [applyTarget, setApplyTarget] = useState("");
  const [applyStatus, setApplyStatus] = useState<{ text: string; color: string } | null>(null);
  const [applying, setApplying] = useState(false);

  async function bundleApplyConfirm() {
    if (!applyBundle) return;
    const target = applyTarget.trim();
    if (!target) { setApplyStatus({ text: "✗ Enter a username or user ID.", color: "#ff8080" }); return; }
    setApplying(true);
    setApplyStatus({ text: "Applying...", color: "rgba(255,255,255,.45)" });
    try {
      const res = await fetch("/api/admin_action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "apply_bundle", bundle_id: applyBundle.id, target }) });
      const data = await res.json();
      if (data.success) {
        setApplyStatus({ text: `✓ Bundle applied to @${data.user}!`, color: "#4ade80" });
        showToast(`Bundle applied to @${data.user}`, "success");
        setTimeout(() => setApplyBundle(null), 1800);
      } else {
        setApplyStatus({ text: `✗ ${data.error || "Failed"}`, color: "#ff8080" });
      }
    } catch {
      setApplyStatus({ text: "✗ Network error", color: "#ff8080" });
    }
    setApplying(false);
  }

  return (
    <div className="admin-tab-panel">
      {/* ── Infected Mail ── */}
      <div className="dash-card" style={{ marginBottom: "1.5rem", borderColor: "rgba(168,85,247,.35)", background: "linear-gradient(160deg,rgba(168,85,247,.05) 0%,rgba(99,102,241,.03) 100%)" }}>
        <div className="dash-card-header" style={{ borderBottom: "1px solid rgba(255,255,255,.06)", paddingBottom: "1rem", marginBottom: "1.2rem" }}>
          <span className="dash-card-title" style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" width="18" height="18"><path d="M3 11l19-9-9 19-2-8-8-2z" /></svg>
            <span style={{ color: "#a855f7" }}>Infected Mail</span>
            <span style={{ fontSize: ".65rem", padding: ".2rem .55rem", background: "rgba(168,85,247,.15)", border: "1px solid rgba(168,85,247,.4)", borderRadius: 99, color: "#a855f7", fontWeight: 700, letterSpacing: ".05em" }}>OWNER</span>
          </span>
          <span style={{ fontSize: ".78rem", color: "rgba(255,255,255,.35)" }}>Send an announcement notification to a group of users</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: ".75rem", color: "rgba(255,255,255,.5)", fontWeight: 600, display: "block", marginBottom: ".4rem" }}>TITLE</label>
            <input type="text" value={mailTitle} onChange={(e) => setMailTitle(e.target.value)} placeholder="e.g. Big Update is here!" maxLength={200}
              style={{ width: "100%", padding: ".6rem .85rem", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, color: "#fff", fontSize: ".85rem", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: ".75rem", color: "rgba(255,255,255,.5)", fontWeight: 600, display: "block", marginBottom: ".4rem" }}>DESCRIPTION</label>
            <textarea value={mailBody} onChange={(e) => setMailBody(e.target.value)} placeholder="Write the announcement content here..." maxLength={500} rows={3}
              style={{ width: "100%", padding: ".6rem .85rem", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, color: "#fff", fontSize: ".85rem", outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ fontSize: ".75rem", color: "rgba(255,255,255,.5)", fontWeight: 600, display: "block", marginBottom: ".4rem" }}>RECIPIENT</label>
            <select value={mailRecipient} onChange={(e) => setMailRecipient(e.target.value)}
              style={{ width: "100%", padding: ".6rem .85rem", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, color: "#fff", fontSize: ".85rem", outline: "none", boxSizing: "border-box", cursor: "pointer" }}>
              <option value="all">🌍 Everyone</option>
              <option value="premium">⭐ Premium users</option>
              <option value="verified">✅ Verified users</option>
              <option value="content_creator">🎬 Content Creators</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: ".75rem", color: "rgba(255,255,255,.5)", fontWeight: 600, display: "block", marginBottom: ".4rem" }}>AUTHOR</label>
            <input type="text" value={mailAuthor} onChange={(e) => setMailAuthor(e.target.value)} placeholder="e.g. Infected Team" maxLength={80}
              style={{ width: "100%", padding: ".6rem .85rem", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, color: "#fff", fontSize: ".85rem", outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <button onClick={sendInfectedMail} disabled={mailSending} style={{ opacity: mailSending ? .6 : 1, display: "inline-flex", alignItems: "center", gap: ".5rem", padding: ".6rem 1.2rem", background: "linear-gradient(135deg,#a855f7,#6366f1)", border: "none", borderRadius: 8, color: "#fff", fontSize: ".85rem", fontWeight: 700, cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><path d="M3 11l19-9-9 19-2-8-8-2z" /></svg> Send Announcement
          </button>
          {mailStatus && <span style={{ fontSize: ".8rem", color: mailStatus.color }}>{mailStatus.text}</span>}
        </div>
      </div>

      {/* ── Bundles ── */}
      <div className="dash-card" style={{ marginBottom: "1.5rem", borderColor: "rgba(16,185,129,.3)", background: "linear-gradient(160deg,rgba(16,185,129,.05) 0%,rgba(5,150,105,.02) 100%)" }}>
        <div className="dash-card-header" style={{ borderBottom: "1px solid rgba(255,255,255,.06)", paddingBottom: "1rem", marginBottom: "1.4rem" }}>
          <span className="dash-card-title" style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="18" height="18"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            <span style={{ color: "#10b981" }}>Bundles</span>
            <span style={{ fontSize: ".65rem", padding: ".2rem .55rem", background: "rgba(16,185,129,.15)", border: "1px solid rgba(16,185,129,.4)", borderRadius: 99, color: "#10b981", fontWeight: 700, letterSpacing: ".05em" }}>OWNER</span>
          </span>
          <span style={{ fontSize: ".78rem", color: "rgba(255,255,255,.35)" }}>Create reward bundles and apply them to users</span>
        </div>

        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "1.2rem", marginBottom: "1.4rem" }}>
          <div style={{ fontSize: ".75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.45)", marginBottom: "1rem" }}>Create New Bundle</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".85rem", marginBottom: ".85rem" }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: ".72rem", color: "rgba(255,255,255,.45)", fontWeight: 600, display: "block", marginBottom: ".35rem" }}>BUNDLE NAME</label>
              <input type="text" value={bName} onChange={(e) => setBName(e.target.value)} placeholder="e.g. VIP Starter Pack" maxLength={100}
                style={{ width: "100%", padding: ".6rem .85rem", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, color: "#fff", fontSize: ".85rem", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: ".72rem", color: "rgba(255,255,255,.45)", fontWeight: 600, display: "block", marginBottom: ".35rem" }}>PRICE</label>
              <input type="number" value={bPrice} onChange={(e) => setBPrice(e.target.value)} placeholder="0.00" min={0} step={0.01}
                style={{ width: "100%", padding: ".6rem .85rem", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, color: "#fff", fontSize: ".85rem", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: ".72rem", color: "rgba(255,255,255,.45)", fontWeight: 600, display: "block", marginBottom: ".35rem" }}>CURRENCY</label>
              <select value={bPriceType} onChange={(e) => setBPriceType(e.target.value as "euro" | "tokens")}
                style={{ width: "100%", padding: ".6rem .85rem", background: "rgba(20,20,30,1)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, color: "#fff", fontSize: ".85rem", outline: "none", boxSizing: "border-box", cursor: "pointer" }}>
                <option value="euro">€ Euro</option>
                <option value="tokens">🪙 Tokens</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: ".72rem", color: "rgba(255,255,255,.45)", fontWeight: 600, display: "block", marginBottom: ".35rem" }}>PREMIUM DAYS (0 = none)</label>
              <input type="number" value={bPremiumDays} onChange={(e) => setBPremiumDays(e.target.value)} placeholder="0" min={0} max={9999}
                style={{ width: "100%", padding: ".6rem .85rem", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, color: "#fff", fontSize: ".85rem", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          <div style={{ marginBottom: ".85rem" }}>
            <label style={{ fontSize: ".72rem", color: "rgba(255,255,255,.45)", fontWeight: 600, display: "block", marginBottom: ".5rem" }}>BADGES (select to include)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".45rem" }}>
              {MANAGEABLE_BADGES.map((bid) => {
                const def = ALL_BADGES[bid];
                const checked = bBadges.has(bid);
                return (
                  <label key={bid} style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", padding: ".35rem .7rem", background: "rgba(255,255,255,.04)", border: `1px solid ${checked ? "rgba(16,185,129,.5)" : "rgba(255,255,255,.09)"}`, borderRadius: 8, cursor: "pointer", fontSize: ".78rem", color: "rgba(255,255,255,.65)", userSelect: "none" }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleSet(bBadges, setBBadges, bid)} style={{ accentColor: "#10b981", width: 13, height: 13 }} />
                    <span style={{ color: def.color }}>●</span> {def.name}
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: ".72rem", color: "rgba(255,255,255,.45)", fontWeight: 600, display: "block", marginBottom: ".5rem" }}>EFFECTS (select to include)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".45rem" }}>
              {Object.entries(SHOP_EFFECTS).map(([eid, e]) => {
                const checked = bEffects.has(eid);
                return (
                  <label key={eid} style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", padding: ".35rem .7rem", background: "rgba(255,255,255,.04)", border: `1px solid ${checked ? "rgba(99,102,241,.45)" : "rgba(255,255,255,.09)"}`, borderRadius: 8, cursor: "pointer", fontSize: ".78rem", color: "rgba(255,255,255,.65)", userSelect: "none" }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleSet(bEffects, setBEffects, eid)} style={{ accentColor: "#6366f1", width: 13, height: 13 }} />
                    <span style={{ fontSize: ".65rem", padding: ".1rem .4rem", background: "rgba(99,102,241,.15)", borderRadius: 4, color: "#a5b4fc", fontWeight: 600 }}>{e.type}</span>
                    {e.name}
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
            <button onClick={bundleCreate} disabled={bCreating} style={{ opacity: bCreating ? .6 : 1, display: "inline-flex", alignItems: "center", gap: ".5rem", padding: ".6rem 1.2rem", background: "linear-gradient(135deg,#10b981,#059669)", border: "none", borderRadius: 8, color: "#fff", fontSize: ".85rem", fontWeight: 700, cursor: "pointer" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> Create Bundle
            </button>
            {bStatus && <span style={{ fontSize: ".8rem", color: bStatus.color }}>{bStatus.text}</span>}
          </div>
        </div>

        <div>
          {bundles.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1.5rem", color: "rgba(255,255,255,.3)", fontSize: ".82rem" }}>No bundles created yet. Create one above.</div>
          ) : (
            <>
              <div style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.35)", marginBottom: ".75rem" }}>{bundles.length} bundle(s) created</div>
              <div style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
                {bundles.map((bn) => {
                  const priceStr = bn.priceType === "euro" ? `€${bn.price.toFixed(2)}` : `${bn.price.toFixed(0)} tokens`;
                  return (
                    <div key={bn.id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: ".85rem 1rem", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 10, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontWeight: 700, fontSize: ".9rem", color: "#fff", marginBottom: ".25rem" }}>{bn.name}</div>
                        <div style={{ fontSize: ".75rem", color: "rgba(255,255,255,.45)", display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
                          <span style={{ background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.3)", borderRadius: 6, padding: ".1rem .45rem", color: "#10b981", fontWeight: 700 }}>{priceStr}</span>
                          {bn.premiumDays > 0 && <span style={{ background: "rgba(255,215,0,.1)", border: "1px solid rgba(255,215,0,.3)", borderRadius: 6, padding: ".1rem .45rem", color: "#ffd700", fontWeight: 600 }}>⭐ {bn.premiumDays}d Premium</span>}
                          {bn.badges.map((b) => <span key={b} style={{ background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.2)", borderRadius: 6, padding: ".1rem .45rem", color: "#fbbf24", fontSize: ".7rem" }}>🏅 {b}</span>)}
                          {bn.effects.map((e) => <span key={e} style={{ background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", borderRadius: 6, padding: ".1rem .45rem", color: "#a5b4fc", fontSize: ".7rem" }}>✨ {e}</span>)}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexShrink: 0 }}>
                        <button onClick={() => { setApplyBundle(bn); setApplyTarget(""); setApplyStatus(null); }}
                          style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", padding: ".45rem .9rem", background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.3)", borderRadius: 8, color: "#10b981", fontSize: ".78rem", fontWeight: 600, cursor: "pointer" }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12" /></svg> Apply to User
                        </button>
                        <button onClick={() => bundleDelete(bn.id)}
                          style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", padding: ".45rem .75rem", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, color: "#ef4444", fontSize: ".78rem", fontWeight: 600, cursor: "pointer" }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {applyBundle && (
        <div style={{ display: "flex", position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)", zIndex: 9999, alignItems: "center", justifyContent: "center" }} onClick={(e) => { if (e.target === e.currentTarget) setApplyBundle(null); }}>
          <div style={{ background: "#13131a", border: "1px solid rgba(16,185,129,.3)", borderRadius: 16, padding: "1.6rem", width: "min(420px,92vw)", boxShadow: "0 20px 60px rgba(0,0,0,.6)" }}>
            <div style={{ fontSize: "1rem", fontWeight: 800, fontFamily: "'Syne',sans-serif", color: "#fff", marginBottom: ".35rem" }}>Apply Bundle</div>
            <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,.45)", marginBottom: "1.2rem" }}>Applying: <strong style={{ color: "#10b981" }}>{applyBundle.name}</strong></div>
            <label style={{ fontSize: ".72rem", color: "rgba(255,255,255,.45)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".4rem" }}>USERNAME OR USER ID</label>
            <input type="text" value={applyTarget} onChange={(e) => setApplyTarget(e.target.value)} placeholder="@username or #1234"
              onKeyDown={(e) => { if (e.key === "Enter") bundleApplyConfirm(); }}
              style={{ width: "100%", padding: ".65rem .9rem", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, color: "#fff", fontSize: ".88rem", outline: "none", boxSizing: "border-box", marginBottom: ".85rem" }} autoFocus />
            <div style={{ display: "flex", gap: ".75rem", justifyContent: "flex-end" }}>
              <button onClick={() => setApplyBundle(null)} style={{ padding: ".55rem 1.1rem", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, color: "rgba(255,255,255,.7)", fontSize: ".82rem", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={bundleApplyConfirm} disabled={applying} style={{ opacity: applying ? .6 : 1, display: "inline-flex", alignItems: "center", gap: ".4rem", padding: ".55rem 1.2rem", background: "linear-gradient(135deg,#10b981,#059669)", border: "none", borderRadius: 8, color: "#fff", fontSize: ".82rem", fontWeight: 700, cursor: "pointer" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12" /></svg> Apply Bundle
              </button>
            </div>
            {applyStatus && <div style={{ fontSize: ".78rem", marginTop: ".6rem", textAlign: "center", color: applyStatus.color }}>{applyStatus.text}</div>}
          </div>
        </div>
      )}

      {/* ── Whitelist / Maintenance ── */}
      <div className="dash-card" style={{ marginBottom: "1.5rem", borderColor: whitelistEnabled ? "rgba(255,100,100,.3)" : "rgba(255,255,255,.07)", transition: "border-color .3s" }}>
        <div className="dash-card-header" style={{ borderBottom: "1px solid rgba(255,255,255,.06)", paddingBottom: "1rem", marginBottom: "1.2rem" }}>
          <span className="dash-card-title" style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            Whitelist / Maintenance
          </span>
          <span style={{ fontSize: ".75rem", color: "rgba(255,255,255,.3)", fontWeight: 400 }}>Owner only</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: ".9rem", fontWeight: 700, marginBottom: ".3rem", color: "#fff", display: "flex", alignItems: "center", gap: ".4rem" }}>
              Site Status:
              <span style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", color: whitelistEnabled ? "#ff6b6b" : "#4ade80" }}>
                {whitelistEnabled ? (<><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> Maintenance Mode ON</>) : (<><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12" /></svg> Normal — Site Open</>)}
              </span>
            </div>
            <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.38)", lineHeight: 1.55 }}>
              When <strong style={{ color: "rgba(255,255,255,.6)" }}>ON</strong>: only Moderators, Admins and Owners can access the site.<br />
              All other visitors see the Maintenance page. Bans are <em>not</em> affected.
            </div>
          </div>
          <button onClick={toggleWhitelist} disabled={wlLoading}
            style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: ".45rem", padding: ".65rem 1.4rem", borderRadius: 10, fontSize: ".82rem", fontWeight: 700, cursor: "pointer", border: "1px solid", transition: "all .2s", background: whitelistEnabled ? "rgba(74,222,128,.12)" : "rgba(239,68,68,.12)", color: whitelistEnabled ? "#4ade80" : "#ef4444", borderColor: whitelistEnabled ? "rgba(74,222,128,.35)" : "rgba(239,68,68,.35)", opacity: wlLoading ? .6 : 1 }}>
            {whitelistEnabled ? (<><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12" /></svg> Disable Maintenance</>) : (<><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> Enable Maintenance</>)}
          </button>
        </div>
      </div>

      {/* ── x2 Tokens Event ── */}
      <div className="dash-card" style={{ marginBottom: "1.5rem", borderColor: x2Enabled ? "rgba(255,140,0,.5)" : "rgba(255,255,255,.07)", transition: "border-color .3s", background: x2Enabled ? "linear-gradient(160deg,rgba(255,100,0,.07) 0%,rgba(255,140,0,.03) 100%)" : undefined }}>
        <div className="dash-card-header" style={{ borderBottom: "1px solid rgba(255,255,255,.06)", paddingBottom: "1rem", marginBottom: "1.2rem" }}>
          <span className="dash-card-title" style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ color: "#ff9900" }}><path d="M7 2v11h3v9l7-12h-4l4-8z" /></svg>
            x2 Tokens Event
          </span>
          <span style={{ fontSize: ".75rem", color: "rgba(255,255,255,.3)", fontWeight: 400 }}>Owner only</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: ".9rem", fontWeight: 700, marginBottom: ".3rem", color: "#fff", display: "flex", alignItems: "center", gap: ".4rem" }}>
              Status eveniment:
              <span style={{ color: x2Enabled ? "#ff9900" : "rgba(255,255,255,.4)" }}>
                {x2Enabled ? (<><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style={{ color: "#ff9900", verticalAlign: "-2px" }}><path d="M7 2v11h3v9l7-12h-4l4-8z" /></svg> ACTIVE — x2 Tokens for everyone</>) : "Inactive"}
              </span>
            </div>
            <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.38)", lineHeight: 1.55 }}>
              When <strong style={{ color: "rgba(255,255,255,.6)" }}>ACTIVE</strong>: all users receive <strong style={{ color: "#ff9900" }}>double tokens</strong> on pack purchases, profile views and referrals.<br />
              Deactivate the event to return to normal token rates.
            </div>
          </div>
          <button onClick={toggleX2} disabled={x2Loading}
            style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: ".45rem", padding: ".65rem 1.4rem", borderRadius: 10, fontSize: ".82rem", fontWeight: 700, cursor: "pointer", border: "1px solid", transition: "all .2s", background: x2Enabled ? "rgba(74,222,128,.12)" : "rgba(255,140,0,.12)", color: x2Enabled ? "#4ade80" : "#ff9900", borderColor: x2Enabled ? "rgba(74,222,128,.35)" : "rgba(255,140,0,.35)", opacity: x2Loading ? .6 : 1 }}>
            {x2Enabled ? (<><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12" /></svg> Deactivate x2 Tokens</>) : (<><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M7 2v11h3v9l7-12h-4l4-8z" /></svg> Activate x2 Tokens</>)}
          </button>
        </div>
      </div>
    </div>
  );
}
