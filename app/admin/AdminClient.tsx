"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { showToast } from "@/lib/toast";
import { BADGE_SVG, ALL_BADGES } from "@/lib/badge-defs";
import { SHOP_EFFECTS } from "@/lib/shop";
import { DECORATIONS } from "@/lib/decorations";
import SafeImg from "@/components/SafeImg";
import OwnerTab from "./OwnerTab";

type AdminUser = {
  id: number; username: string; isAdmin: boolean; isOwner: boolean; isMod: boolean;
  banned: boolean; banUntil: string | null; createdAt: string; tokens: number;
  isPremium: boolean; premiumExpiresAt: string | null; views: number; links: number;
  badges: string[]; effects: string[]; decorations: string[]; avatar: string;
};

type Bundle = { id: number; name: string; price: number; priceType: "euro" | "tokens"; badges: string[]; effects: string[]; premiumDays: number };
type RedeemCode = { id: number; code: string; tokens: number; maxUses: number; usesCount: number; expiresAt: string | null; active: boolean };
type DynamicBadge = { badgeKey: string; label: string; color: string };
type SiteDomain = { id: number; hostname: string; status: string; errorMessage: string | null; isDefault: boolean; tier: string };

interface Props {
  iAmOwner: boolean;
  iAmAdmin: boolean;
  iAmMod: boolean;
  canGrantOwner: boolean;
  myOwnerRank: number;
  myUserId: number;
  stats: { totalUsers: number; totalViews: number; totalLinks: number; totalTokensSpent: number; premiumCount: number; verifiedCount: number; bannedCount: number };
  whitelistEnabled: boolean;
  x2EventEnabled: boolean;
  bundles: Bundle[];
  redeemCodes: RedeemCode[];
  dynamicBadges: DynamicBadge[];
  siteDomains: SiteDomain[];
  users: AdminUser[];
  page: number;
  totalPages: number;
  search: string;
}

const MANAGEABLE_BADGES = ["verified", "champion", "fresh", "lover", "known", "rich", "trapstar", "the_killer", "crew", "billionaire", "content_creator", "designer"];

function roleKey(u: { isOwner: boolean; isAdmin: boolean; isMod: boolean }): "owner" | "admin" | "mod" | "user" {
  if (u.isOwner) return "owner";
  if (u.isAdmin) return "admin";
  if (u.isMod) return "mod";
  return "user";
}

function RoleBadge({ u }: { u: { isOwner: boolean; isAdmin: boolean; isMod: boolean } }) {
  if (u.isOwner) return <span className="badge badge-owner user-status-badge">Owner</span>;
  if (u.isAdmin) return <span className="badge badge-admin user-status-badge">Admin</span>;
  if (u.isMod) return <span className="badge user-status-badge" style={{ background: "rgba(168,85,247,.15)", border: "1px solid rgba(168,85,247,.4)", color: "#a855f7", fontSize: ".68rem", padding: ".2rem .6rem", borderRadius: 20, fontWeight: 800, letterSpacing: ".04em" }}>Mod</span>;
  return <span className="badge badge-normal user-status-badge">User</span>;
}

export default function AdminClient(props: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"staff" | "owner">("staff");
  const [searchQ, setSearchQ] = useState(props.search);
  const [epUser, setEpUser] = useState<AdminUser | null>(null);
  const [epIsSelf, setEpIsSelf] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [inFlight, setInFlight] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; text: string; btnLabel: string; cb: () => void } | null>(null);

  const [banType, setBanType] = useState<"permanent" | "temporary">("permanent");
  const [banDays, setBanDays] = useState("");
  const [tokensInput, setTokensInput] = useState("0");
  const [premiumDaysInput, setPremiumDaysInput] = useState("30");

  const [whitelistEnabled, setWhitelistEnabled] = useState(props.whitelistEnabled);
  const [x2Enabled, setX2Enabled] = useState(props.x2EventEnabled);
  const [wlLoading, setWlLoading] = useState(false);
  const [x2Loading, setX2Loading] = useState(false);

  const [dynamicBadges, setDynamicBadges] = useState(props.dynamicBadges);
  const [newBadgeName, setNewBadgeName] = useState("");
  const [newBadgeColor, setNewBadgeColor] = useState("#5865F2");
  const [creatingBadge, setCreatingBadge] = useState(false);

  async function createBadge() {
    const name = newBadgeName.trim();
    if (!name || creatingBadge) return;
    setCreatingBadge(true);
    try {
      const res = await fetch("/api/admin_action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_dynamic_badge", name, color: newBadgeColor }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Badge created", "success");
        setDynamicBadges((prev) => [{ badgeKey: json.badge_key, label: name, color: newBadgeColor }, ...prev]);
        setNewBadgeName("");
      } else {
        showToast(json.error || "Error", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setCreatingBadge(false);
    }
  }

  function deleteBadge(badgeKey: string, label: string) {
    showConfirm(`Delete "${label}"`, `Delete this badge and its Discord role? This can't be undone.`, "Delete", async () => {
      try {
        const res = await fetch("/api/admin_action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete_dynamic_badge", badge_key: badgeKey }),
        });
        const json = await res.json();
        if (json.success) {
          showToast(json.message || "Badge deleted", "success");
          setDynamicBadges((prev) => prev.filter((b) => b.badgeKey !== badgeKey));
        } else {
          showToast(json.error || "Error", "error");
        }
      } catch {
        showToast("Network error", "error");
      }
    });
  }

  const [siteDomains, setSiteDomains] = useState(props.siteDomains);
  const [newDomainHost, setNewDomainHost] = useState("");
  const [newDomainTier, setNewDomainTier] = useState<"free" | "premium">("free");
  const [addingDomain, setAddingDomain] = useState(false);
  const [domainBusyId, setDomainBusyId] = useState<number | null>(null);

  async function addDomain() {
    const hostname = newDomainHost.trim().toLowerCase();
    if (!hostname || addingDomain) return;
    setAddingDomain(true);
    try {
      const res = await fetch("/api/admin_action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_domain", hostname, tier: newDomainTier }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Domain added", "success");
        setSiteDomains((prev) => [{ id: json.domain_id, hostname, status: json.status || "pending", errorMessage: null, isDefault: false, tier: newDomainTier }, ...prev]);
        setNewDomainHost("");
      } else {
        showToast(json.error || "Error", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setAddingDomain(false);
    }
  }

  async function setDomainTier(id: number, tier: "free" | "premium") {
    setDomainBusyId(id);
    try {
      const res = await fetch("/api/admin_action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_domain_tier", domain_id: id, tier }),
      });
      const json = await res.json();
      if (json.success) {
        setSiteDomains((prev) => prev.map((d) => (d.id === id ? { ...d, tier } : d)));
        showToast(json.message || "Updated", "success");
      } else {
        showToast(json.error || "Error", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setDomainBusyId(null);
    }
  }

  async function recheckDomain(id: number) {
    setDomainBusyId(id);
    try {
      const res = await fetch("/api/admin_action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recheck_domain", domain_id: id }),
      });
      const json = await res.json();
      showToast(json.message || (json.success ? "Done" : "Error"), json.success ? "success" : "error");
      if (json.status) setSiteDomains((prev) => prev.map((d) => (d.id === id ? { ...d, status: json.status, errorMessage: json.success && json.status === "active" ? null : d.errorMessage } : d)));
    } catch {
      showToast("Network error", "error");
    } finally {
      setDomainBusyId(null);
    }
  }

  function deleteDomain(id: number, hostname: string) {
    showConfirm(`Delete "${hostname}"`, `This removes the nginx config and SSL cert for this domain. This can't be undone.`, "Delete", async () => {
      try {
        const res = await fetch("/api/admin_action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete_domain", domain_id: id }),
        });
        const json = await res.json();
        if (json.success) {
          showToast(json.message || "Domain deleted", "success");
          setSiteDomains((prev) => prev.filter((d) => d.id !== id));
        } else {
          showToast(json.error || "Error", "error");
        }
      } catch {
        showToast("Network error", "error");
      }
    });
  }

  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem("adminTab") : null;
    if (saved === "owner" && props.iAmOwner) setTab("owner");
  }, [props.iAmOwner]);

  function switchTab(t: "staff" | "owner") {
    setTab(t);
    try { sessionStorage.setItem("adminTab", t); } catch {}
  }

  // Keep the open edit panel in sync with fresh server data after router.refresh()
  useEffect(() => {
    if (!epUser) return;
    const fresh = props.users.find((u) => u.id === epUser.id);
    if (fresh) setEpUser(fresh);
  }, [props.users]); // eslint-disable-line react-hooks/exhaustive-deps

  function openEditPanel(u: AdminUser, isSelf = false) {
    setEpUser(u);
    setEpIsSelf(isSelf);
    setBanType("permanent");
    setBanDays("");
    setTokensInput(String(u.tokens ?? 0));
    setPremiumDaysInput("30");
    setPanelOpen(true);
    document.body.style.overflow = "hidden";
  }
  function closeEditPanel() {
    setPanelOpen(false);
    document.body.style.overflow = "";
    setEpUser(null);
    setInFlight(false);
  }

  function showConfirm(title: string, text: string, btnLabel: string, cb: () => void) {
    setConfirm({ title, text, btnLabel, cb });
  }
  function closeConfirm() { setConfirm(null); }
  function doConfirm() {
    if (confirm) confirm.cb();
    setConfirm(null);
  }

  async function epCall(action: string, extra: Record<string, unknown> = {}) {
    if (!epUser || inFlight) return;
    setInFlight(true);
    try {
      const res = await fetch("/api/admin_action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, target_id: epUser.id, self_edit: epIsSelf, ...extra }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Done", "success");
        if (extra.role !== undefined) {
          setEpUser((prev) => prev ? { ...prev, isOwner: extra.role === "owner", isAdmin: extra.role === "admin" || extra.role === "owner", isMod: extra.role === "mod" } : prev);
        }
        router.refresh();
      } else {
        showToast(json.error || "Error", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setInFlight(false);
    }
  }

  function epDoBan() {
    if (!epUser) return;
    if (banType === "temporary") {
      const days = parseInt(banDays || "0");
      if (!days || days < 1) { showToast("Enter a valid number of days", "error"); return; }
      showConfirm(`Ban (${days}d)`, `Ban @${epUser.username} for ${days} day${days > 1 ? "s" : ""}?`, "Ban", () => epCall("ban", { days }));
    } else {
      showConfirm("Permanent Ban", `Ban @${epUser.username} permanently?`, "Ban permanently", () => epCall("ban", { days: 0 }));
    }
  }
  function epDoUnban() {
    if (!epUser) return;
    showConfirm("Unban user", `Remove ban from @${epUser.username}?`, "Unban", () => epCall("unban"));
  }
  function epDoDelete() {
    if (!epUser) return;
    showConfirm("Delete Account", `Permanently delete @${epUser.username}? This cannot be undone.`, "Delete", () => epCall("delete"));
  }
  function epBadge(badgeId: string, grant: boolean) {
    epCall(grant ? "badge_grant" : "badge_revoke", { badge_id: badgeId }).then(() => {
      setEpUser((prev) => {
        if (!prev) return prev;
        const set = new Set(prev.badges);
        if (grant) set.add(badgeId); else set.delete(badgeId);
        return { ...prev, badges: Array.from(set) };
      });
    });
  }
  function epEffect(effectId: string, grant: boolean) {
    epCall(grant ? "effect_grant" : "effect_revoke", { effect_id: effectId }).then(() => {
      setEpUser((prev) => {
        if (!prev) return prev;
        const set = new Set(prev.effects);
        if (grant) set.add(effectId); else set.delete(effectId);
        return { ...prev, effects: Array.from(set) };
      });
    });
  }
  function epDecoration(decorationId: string, grant: boolean) {
    epCall(grant ? "decoration_grant" : "decoration_revoke", { decoration_id: decorationId }).then(() => {
      setEpUser((prev) => {
        if (!prev) return prev;
        const set = new Set(prev.decorations);
        if (grant) set.add(decorationId); else set.delete(decorationId);
        return { ...prev, decorations: Array.from(set) };
      });
    });
  }
  function epSetTokens() {
    const val = parseInt(tokensInput || "-1");
    if (isNaN(val) || val < 0) { showToast("Enter a valid token amount", "error"); return; }
    epCall("set_tokens", { tokens: val });
  }
  function epGrantPremium() {
    if (!epUser) return;
    const days = parseInt(premiumDaysInput || "0");
    if (!days || days < 1) { showToast("Enter a valid number of days", "error"); return; }
    const label = epUser.isPremium ? `Extend Premium by ${days} day(s)?` : `Grant Premium to @${epUser.username} for ${days} day(s)?`;
    showConfirm("Set Premium", label, "Confirm", () => epCall("set_premium", { days }));
  }
  function epRevokePremium() {
    if (!epUser) return;
    showConfirm("Revoke Premium", `Remove Premium from @${epUser.username}?`, "Revoke", () => epCall("set_premium", { days: 0 }));
  }
  function epSetRole(role: string) {
    if (!epUser) return;
    const labels: Record<string, string> = { user: "User", mod: "Mod", admin: "Admin", owner: "Owner" };
    showConfirm(`Set role: ${labels[role] || role}`, `Set @${epUser.username} as ${labels[role] || role}?`, "Confirm", () => epCall("set_role", { role }));
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/admin?q=${encodeURIComponent(searchQ)}`);
  }

  async function toggleWhitelist() {
    const isOn = whitelistEnabled;
    showConfirm(
      isOn ? "Disable Maintenance?" : "Enable Maintenance?",
      isOn ? "The site will become publicly accessible again." : "All non-staff users will be blocked from the site.",
      isOn ? "Disable Maintenance" : "Enable Maintenance",
      async () => {
        setWlLoading(true);
        try {
          const res = await fetch("/api/admin_action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle_whitelist" }) });
          const data = await res.json();
          if (data.success) { setWhitelistEnabled(data.whitelist_enabled); showToast(data.message, "success"); }
          else showToast(data.error || "Action failed", "error");
        } catch { showToast("Network error", "error"); }
        setWlLoading(false);
      }
    );
  }

  async function toggleX2() {
    const isOn = x2Enabled;
    showConfirm(
      isOn ? "Deactivate x2 Tokens?" : "Activate x2 Tokens?",
      isOn ? "Users will receive normal token amounts (no multiplier)." : "All users will receive DOUBLE tokens on purchases, views and referrals.",
      isOn ? "Deactivate" : "Activate x2",
      async () => {
        setX2Loading(true);
        try {
          const res = await fetch("/api/admin_action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle_x2_tokens" }) });
          const data = await res.json();
          if (data.success) { setX2Enabled(data.x2_tokens_enabled); showToast(data.message, "success"); }
          else showToast(data.error || "Action failed", "error");
        } catch { showToast("Network error", "error"); }
        setX2Loading(false);
      }
    );
  }

  const isActivePremium = (u: AdminUser) => u.isPremium && (!u.premiumExpiresAt || new Date(u.premiumExpiresAt).getTime() > Date.now());

  return (
    <>
      <div className="admin-header">
        <div>
          <div style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--accent)", marginBottom: ".2rem", display: "flex", alignItems: "center", gap: ".35rem" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            Admin
          </div>
          <h1>Admin Panel</h1>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: 4, gap: 4, flexShrink: 0 }}>
          <button className={`admin-tab-btn ${tab === "staff" ? "active" : ""}`} onClick={() => switchTab("staff")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            Staff
          </button>
          {props.iAmOwner && (
            <button id="btn-tab-owner" className={`admin-tab-btn ${tab === "owner" ? "active" : ""}`} onClick={() => switchTab("owner")}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style={{ color: "#fbbf24" }}><path d="M5 16L3 5l5.5 5L12 2l3.5 8L21 5l-2 11H5zm14 3H5v2h14v-2z" /></svg>
              Owner
            </button>
          )}
        </div>
      </div>

      {tab === "staff" && (
        <div className="admin-tab-panel">
          <div className="admin-stats">
            <div className="stat-card">
              <div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg></div>
              <div className="stat-number">{props.stats.totalUsers.toLocaleString()}</div>
              <div className="stat-label">Accounts Created</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg></div>
              <div className="stat-number">{props.stats.totalViews.toLocaleString()}</div>
              <div className="stat-label">Total Views</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg></div>
              <div className="stat-number">{props.stats.totalLinks.toLocaleString()}</div>
              <div className="stat-label">Total Links</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ color: "#a78bfa" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg></div>
              <div className="stat-number" style={{ color: "#a78bfa" }}>{props.stats.totalTokensSpent.toLocaleString()}</div>
              <div className="stat-label">Tokens Spent</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ color: "#ffd700" }}><svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.25)" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" opacity=".8" /></svg></div>
              <div className="stat-number" style={{ color: "#ffd700" }}>{props.stats.premiumCount.toLocaleString()}</div>
              <div className="stat-label">Premium Subscribers</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ color: "#34d399" }}><svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg></div>
              <div className="stat-number" style={{ color: "#34d399" }}>{props.stats.verifiedCount.toLocaleString()}</div>
              <div className="stat-label">Verified Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ color: "#ff6b6b" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg></div>
              <div className="stat-number" style={{ color: "#ff6b6b" }}>{props.stats.bannedCount.toLocaleString()}</div>
              <div className="stat-label">Banned Accounts</div>
            </div>
          </div>

          <div className="dash-card">
            <form className="search-wrap" onSubmit={submitSearch}>
              <input type="text" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search by username or email..." className="form-control" />
              <button type="submit" className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: ".4rem" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg> Search
              </button>
              {props.search && <Link href="/admin" className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: ".4rem" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> Reset</Link>}
            </form>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th style={{ color: "var(--text-muted)", fontSize: ".75rem" }}>ID</th><th>User</th><th>Email</th><th>Registered</th><th>Views</th><th>Links</th><th>Plan</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {props.users.length === 0 && <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>No users found.</td></tr>}
                  {props.users.map((u) => {
                    const isMe = u.id === props.myUserId;
                    let actions: React.ReactNode;
                    if (isMe && props.iAmOwner) {
                      actions = (
                        <div className="action-btns">
                          <a href={`/${encodeURIComponent(u.username)}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-xs" title="View profile" style={{ display: "inline-flex", alignItems: "center" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg></a>
                          <button className="btn btn-edit btn-xs" onClick={() => openEditPanel(u, true)} style={{ display: "inline-flex", alignItems: "center", gap: ".35rem" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> Self</button>
                        </div>
                      );
                    } else if (isMe) {
                      actions = <span style={{ color: "var(--text-muted)", fontSize: ".78rem" }}>You</span>;
                    } else if (props.iAmMod && (u.isOwner || u.isAdmin || u.isMod)) {
                      actions = (
                        <div className="action-btns">
                          <a href={`/${encodeURIComponent(u.username)}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-xs" title="View profile" style={{ display: "inline-flex", alignItems: "center" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg></a>
                          <span style={{ color: "var(--text-muted)", fontSize: ".75rem", fontStyle: "italic" }}>No access</span>
                        </div>
                      );
                    } else if (props.iAmOwner && u.isOwner) {
                      actions = (
                        <div className="action-btns">
                          <a href={`/${encodeURIComponent(u.username)}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-xs" title="View profile" style={{ display: "inline-flex", alignItems: "center" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg></a>
                          <button className="btn btn-edit btn-xs" onClick={() => openEditPanel(u)} style={{ display: "inline-flex", alignItems: "center", gap: ".35rem" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> Edit</button>
                        </div>
                      );
                    } else if (props.iAmAdmin && !props.iAmOwner && (u.isOwner || u.isAdmin)) {
                      actions = (
                        <div className="action-btns">
                          <a href={`/${encodeURIComponent(u.username)}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-xs" title="View profile" style={{ display: "inline-flex", alignItems: "center" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg></a>
                          <span style={{ color: "var(--text-muted)", fontSize: ".75rem", fontStyle: "italic" }}>No access</span>
                        </div>
                      );
                    } else {
                      actions = (
                        <div className="action-btns">
                          <a href={`/${encodeURIComponent(u.username)}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-xs" title="View profile" style={{ display: "inline-flex", alignItems: "center" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg></a>
                          <button className="btn btn-edit btn-xs" onClick={() => openEditPanel(u)} style={{ display: "inline-flex", alignItems: "center", gap: ".35rem" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> Edit</button>
                        </div>
                      );
                    }
                    return (
                      <tr key={u.id} data-uid={u.id}>
                        <td style={{ color: "rgba(255,255,255,.3)", fontSize: ".75rem", fontFamily: "'Space Mono',monospace" }}>#{u.id}</td>
                        <td><div className="user-info"><SafeImg src={u.avatar} className="user-avatar-sm" /><div className="user-name">@{u.username}</div></div></td>
                        <td style={{ color: "var(--text-muted)", fontSize: ".8rem" }}>—</td>
                        <td style={{ color: "var(--text-muted)", fontSize: ".78rem", fontFamily: "'Space Mono',monospace", whiteSpace: "nowrap" }}>{new Date(u.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td style={{ fontFamily: "'Space Mono',monospace", fontSize: ".8rem" }}>{u.views.toLocaleString()}</td>
                        <td style={{ fontFamily: "'Space Mono',monospace", fontSize: ".8rem" }}>{u.links}</td>
                        <td>
                          {isActivePremium(u) ? (
                            <span className="badge" style={{ background: "rgba(255,215,0,.15)", border: "1px solid rgba(255,215,0,.4)", color: "#ffd700", fontSize: ".68rem", padding: ".2rem .6rem", borderRadius: 20, fontWeight: 800, letterSpacing: ".04em" }}>PREMIUM</span>
                          ) : (
                            <span className="badge badge-normal" style={{ fontSize: ".68rem", padding: ".2rem .6rem", borderRadius: 20, fontWeight: 700, letterSpacing: ".03em", opacity: .65 }}>FREE</span>
                          )}
                        </td>
                        <td>
                          <RoleBadge u={u} />
                          {u.banned && <span className="badge badge-banned">Banned</span>}
                        </td>
                        <td>{actions}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {props.totalPages > 1 && (
              <div className="pagination">
                <Link href={`/admin?page=${Math.max(1, props.page - 1)}&q=${encodeURIComponent(props.search)}`} className={`page-btn ${props.page <= 1 ? "disabled" : ""}`}>← Prev</Link>
                {Array.from({ length: Math.min(props.totalPages, props.page + 2) - Math.max(1, props.page - 2) + 1 }, (_, i) => Math.max(1, props.page - 2) + i).map((i) => (
                  <Link key={i} href={`/admin?page=${i}&q=${encodeURIComponent(props.search)}`} className={`page-btn ${i === props.page ? "active" : ""}`}>{i}</Link>
                ))}
                <Link href={`/admin?page=${Math.min(props.totalPages, props.page + 1)}&q=${encodeURIComponent(props.search)}`} className={`page-btn ${props.page >= props.totalPages ? "disabled" : ""}`}>Next →</Link>
              </div>
            )}
          </div>
        </div>
      )}

      {props.iAmOwner && tab === "owner" && (
        <OwnerTab
          bundles={props.bundles}
          redeemCodes={props.redeemCodes}
          whitelistEnabled={whitelistEnabled}
          x2Enabled={x2Enabled}
          wlLoading={wlLoading}
          x2Loading={x2Loading}
          toggleWhitelist={toggleWhitelist}
          toggleX2={toggleX2}
          router={router}
          showConfirmFn={showConfirm}
          dynamicBadges={dynamicBadges}
          newBadgeName={newBadgeName}
          setNewBadgeName={setNewBadgeName}
          newBadgeColor={newBadgeColor}
          setNewBadgeColor={setNewBadgeColor}
          creatingBadge={creatingBadge}
          createBadge={createBadge}
          deleteBadge={deleteBadge}
          siteDomains={siteDomains}
          newDomainHost={newDomainHost}
          setNewDomainHost={setNewDomainHost}
          newDomainTier={newDomainTier}
          setNewDomainTier={setNewDomainTier}
          addingDomain={addingDomain}
          addDomain={addDomain}
          domainBusyId={domainBusyId}
          recheckDomain={recheckDomain}
          deleteDomain={deleteDomain}
          setDomainTier={setDomainTier}
        />
      )}

      {/* ═══ EDIT PANEL ═══ */}
      <div className={`ep-overlay ${panelOpen ? "open" : ""}`} onClick={closeEditPanel} />
      <div className={`ep-panel ${panelOpen ? "open" : ""}`}>
        {epUser && (
          <>
            <div className="ep-topbar">
              <div className="ep-user-row">
                <SafeImg src={epUser.avatar} className="ep-avatar" />
                <div className="ep-user-meta">
                  <div className="ep-username">@{epUser.username}</div>
                  <div className="ep-email" />
                </div>
                <div><RoleBadge u={epUser} />{epUser.banned && <span className="badge badge-banned">Banned</span>}</div>
              </div>
              <div className="ep-quick-stats">
                <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" style={{ verticalAlign: "middle", marginRight: 3 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>{epUser.views} views</span>
                <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" style={{ verticalAlign: "middle", marginRight: 3 }}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>{epUser.links} links</span>
              </div>
              <button className="ep-close-btn" onClick={closeEditPanel}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="ep-body">
              {!epIsSelf && !(epUser.isOwner) && (
                <div className="ep-section">
                  <div className="ep-section-head">
                    <div className="ep-section-ico" style={{ background: "rgba(239,68,68,.12)", color: "#ef4444" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                    </div>
                    <div>
                      <div className="ep-section-title">Ban user</div>
                      <div className="ep-section-sub">Restricts access until manually lifted</div>
                    </div>
                  </div>
                  {!epUser.banned ? (
                    <div>
                      <p style={{ fontSize: ".78rem", color: "rgba(255,255,255,.45)", margin: "0 0 .75rem" }}>Choose ban type:</p>
                      <div style={{ display: "flex", gap: "1.25rem", marginBottom: ".9rem" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: ".5rem", cursor: "pointer", fontSize: ".83rem", fontWeight: 600, color: "#fff", userSelect: "none" }}>
                          <input type="radio" checked={banType === "permanent"} onChange={() => setBanType("permanent")} style={{ width: 15, height: 15, accentColor: "#ef4444", cursor: "pointer" }} /> Permanent
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: ".5rem", cursor: "pointer", fontSize: ".83rem", fontWeight: 600, color: "#fff", userSelect: "none" }}>
                          <input type="radio" checked={banType === "temporary"} onChange={() => setBanType("temporary")} style={{ width: 15, height: 15, accentColor: "#ef4444", cursor: "pointer" }} /> Temporary
                        </label>
                      </div>
                      {banType === "temporary" && (
                        <div style={{ marginBottom: ".9rem" }}>
                          <input type="number" min={1} max={3650} placeholder="Number of days (e.g. 7)" value={banDays} onChange={(e) => setBanDays(e.target.value)}
                            style={{ width: "100%", padding: ".55rem .9rem", fontSize: ".85rem", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(239,68,68,.35)", color: "#fff", outline: "none", boxSizing: "border-box" }} />
                        </div>
                      )}
                      <button onClick={epDoBan} style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", padding: ".55rem 1.35rem", borderRadius: 10, fontSize: ".82rem", fontWeight: 700, cursor: "pointer", border: "1px solid rgba(239,68,68,.45)", background: "rgba(239,68,68,.18)", color: "#ff8080" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg> Ban
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: ".6rem", padding: ".6rem .9rem", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.22)", borderRadius: 10, marginBottom: ".9rem" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#ff8080" strokeWidth="2" width="15" height="15" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                        <span style={{ fontSize: ".8rem", color: "#ff8080", fontWeight: 600 }}>{epUser.banUntil ? `Banned until ${new Date(epUser.banUntil).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : "Banned permanently"}</span>
                      </div>
                      <button onClick={epDoUnban} style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", padding: ".55rem 1.35rem", borderRadius: 10, fontSize: ".82rem", fontWeight: 700, cursor: "pointer", border: "1px solid rgba(95,239,165,.3)", background: "rgba(95,239,165,.12)", color: "#5fefa5" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><path d="M20 6L9 17l-5-5" /></svg> Unban
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!epIsSelf && !props.iAmMod && !epUser.isOwner && (
                <div className="ep-section">
                  <div className="ep-section-head">
                    <div className="ep-section-ico" style={{ background: "rgba(239,68,68,.1)", color: "#ff6b6b" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                    </div>
                    <div>
                      <div className="ep-section-title">Delete account</div>
                      <div className="ep-section-sub">Permanent — all data is removed</div>
                    </div>
                  </div>
                  <div className="ep-section-act">
                    <button className="btn btn-danger btn-sm" onClick={epDoDelete} style={{ display: "inline-flex", alignItems: "center", gap: ".4rem" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg> Delete permanently</button>
                  </div>
                </div>
              )}

              {props.iAmOwner && (
                <>
                  <div className="ep-section">
                    <div className="ep-section-head">
                      <div className="ep-section-ico" style={{ background: "rgba(251,191,36,.1)", color: "#fbbf24" }}>
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.09 6.26L21 9.27l-5 4.87 1.18 6.88L12 17.77l-5.18 3.25L8 14.14 3 9.27l6.91-1.01L12 2z" /></svg>
                      </div>
                      <div>
                        <div className="ep-section-title">Badge Manager</div>
                        <div className="ep-section-sub">Grant or revoke badges</div>
                      </div>
                      <span className="ep-owner-tag">Owner</span>
                    </div>
                    <div className="ep-badges-grid">
                      {MANAGEABLE_BADGES.map((bid) => {
                        const def = ALL_BADGES[bid];
                        const has = epUser.badges.includes(bid);
                        return (
                          <div className="ep-badge-row" key={bid}>
                            <div className="ep-badge-ico" style={{ background: def.color + "22", color: def.color, border: `1px solid ${def.color}44`, width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {BADGE_SVG[bid]}
                            </div>
                            <span className="ep-badge-nm" style={{ color: def.color }}>{def.name}</span>
                            {!has ? (
                              <div className="ep-badge-acts"><button className="ep-b-grant" onClick={() => epBadge(bid, true)}>Grant</button></div>
                            ) : (
                              <div className="ep-badge-owned" style={{ display: "flex" }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" style={{ color: "#5fefa5" }}><path d="M20 6L9 17l-5-5" /></svg>
                                <span>Owned</span>
                              </div>
                            )}
                            {has && <div className="ep-badge-acts"><button className="ep-b-revoke" onClick={() => epBadge(bid, false)}>Revoke</button></div>}
                          </div>
                        );
                      })}
                      {dynamicBadges.map((b) => {
                        const has = epUser.badges.includes(b.badgeKey);
                        return (
                          <div className="ep-badge-row" key={b.badgeKey}>
                            <div className="ep-badge-ico" style={{ background: b.color + "22", color: b.color, border: `1px solid ${b.color}44`, width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><circle cx="12" cy="12" r="8" /></svg>
                            </div>
                            <span className="ep-badge-nm" style={{ color: b.color }}>{b.label}</span>
                            {!has ? (
                              <div className="ep-badge-acts"><button className="ep-b-grant" onClick={() => epBadge(b.badgeKey, true)}>Grant</button></div>
                            ) : (
                              <div className="ep-badge-owned" style={{ display: "flex" }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" style={{ color: "#5fefa5" }}><path d="M20 6L9 17l-5-5" /></svg>
                                <span>Owned</span>
                              </div>
                            )}
                            {has && <div className="ep-badge-acts"><button className="ep-b-revoke" onClick={() => epBadge(b.badgeKey, false)}>Revoke</button></div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="ep-section">
                    <div className="ep-section-head">
                      <div className="ep-section-ico" style={{ background: "rgba(96,165,250,.1)", color: "#60a5fa" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                      </div>
                      <div>
                        <div className="ep-section-title">Effects Manager</div>
                        <div className="ep-section-sub">Grant or revoke cursor/avatar/background effects</div>
                      </div>
                      <span className="ep-owner-tag">Owner</span>
                    </div>
                    <div className="ep-badges-grid">
                      {Object.entries(SHOP_EFFECTS).map(([eid, def]) => {
                        const has = epUser.effects.includes(eid);
                        return (
                          <div className="ep-badge-row" key={eid}>
                            <div className="ep-badge-ico" style={{ background: def.color + "22", color: def.color, border: `1px solid ${def.color}44`, width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: ".6rem", fontWeight: 800 }}>
                              {def.type.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="ep-badge-nm" style={{ color: def.color }}>{def.name}</span>
                            {!has ? (
                              <div className="ep-badge-acts"><button className="ep-b-grant" onClick={() => epEffect(eid, true)}>Grant</button></div>
                            ) : (
                              <div className="ep-badge-owned" style={{ display: "flex" }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" style={{ color: "#5fefa5" }}><path d="M20 6L9 17l-5-5" /></svg>
                                <span>Owned</span>
                              </div>
                            )}
                            {has && <div className="ep-badge-acts"><button className="ep-b-revoke" onClick={() => epEffect(eid, false)}>Revoke</button></div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="ep-section">
                    <div className="ep-section-head">
                      <div className="ep-section-ico" style={{ background: "rgba(192,132,252,.1)", color: "#c084fc" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 1 0-16 0" /></svg>
                      </div>
                      <div>
                        <div className="ep-section-title">Decorations Manager</div>
                        <div className="ep-section-sub">Grant or revoke avatar decorations</div>
                      </div>
                      <span className="ep-owner-tag">Owner</span>
                    </div>
                    <div className="ep-badges-grid">
                      {Object.entries(DECORATIONS).map(([did, def]) => {
                        const has = epUser.decorations.includes(did);
                        const rarityColor: Record<string, string> = { common: "#9ca3af", rare: "#60a5fa", epic: "#c084fc", legendary: "#fbbf24" };
                        const c = rarityColor[def.rarity] || "#9ca3af";
                        return (
                          <div className="ep-badge-row" key={did}>
                            <div className="ep-badge-ico" style={{ background: c + "22", color: c, border: `1px solid ${c}44`, width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: ".55rem", fontWeight: 800 }}>
                              {def.rarity.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="ep-badge-nm" style={{ color: c }}>{def.name}</span>
                            {!has ? (
                              <div className="ep-badge-acts"><button className="ep-b-grant" onClick={() => epDecoration(did, true)}>Grant</button></div>
                            ) : (
                              <div className="ep-badge-owned" style={{ display: "flex" }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" style={{ color: "#5fefa5" }}><path d="M20 6L9 17l-5-5" /></svg>
                                <span>Owned</span>
                              </div>
                            )}
                            {has && <div className="ep-badge-acts"><button className="ep-b-revoke" onClick={() => epDecoration(did, false)}>Revoke</button></div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="ep-section">
                    <div className="ep-section-head">
                      <div className="ep-section-ico" style={{ background: "rgba(57,255,20,.1)", color: "var(--accent)" }}>
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" /></svg>
                      </div>
                      <div>
                        <div className="ep-section-title">Set Tokens</div>
                        <div className="ep-section-sub">Set token balance for this user</div>
                      </div>
                      <span className="ep-owner-tag">Owner</span>
                    </div>
                    <div style={{ display: "flex", gap: ".65rem", alignItems: "center", marginTop: ".25rem" }}>
                      <input type="number" min={0} max={999999} value={tokensInput} onChange={(e) => setTokensInput(e.target.value)} placeholder="Token amount"
                        style={{ flex: 1, padding: ".52rem .85rem", fontSize: ".85rem", borderRadius: 10, background: "rgba(57,255,20,.04)", border: "1px solid rgba(57,255,20,.25)", color: "#fff", outline: "none" }} />
                      <button onClick={epSetTokens} style={{ padding: ".52rem 1.1rem", borderRadius: 10, fontSize: ".82rem", fontWeight: 700, cursor: "pointer", border: "1px solid rgba(57,255,20,.35)", background: "rgba(57,255,20,.1)", color: "var(--accent)", whiteSpace: "nowrap" }}>Set tokens</button>
                    </div>
                    <p style={{ fontSize: ".75rem", color: "rgba(255,255,255,.3)", marginTop: ".55rem" }}>Current balance: {(epUser.tokens ?? 0).toLocaleString()} tokens</p>
                  </div>

                  <div className="ep-section">
                    <div className="ep-section-head">
                      <div className="ep-section-ico" style={{ background: "rgba(255,215,0,.1)", color: "#ffd700" }}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2L9.5 8.5H3l5.5 4L6 19l6-4 6 4-2.5-6.5L21 8.5h-6.5L12 2z" /></svg>
                      </div>
                      <div>
                        <div className="ep-section-title">Set Premium</div>
                        <div className="ep-section-sub">Grant or revoke Premium for this user</div>
                      </div>
                      <span className="ep-owner-tag">Owner</span>
                    </div>
                    {isActivePremium(epUser) ? (
                      <div style={{ display: "flex", alignItems: "center", gap: ".6rem", padding: ".55rem .9rem", borderRadius: 10, marginBottom: ".85rem", fontSize: ".8rem", fontWeight: 600, background: "rgba(255,215,0,.08)", border: "1px solid rgba(255,215,0,.25)", color: "#ffd700" }}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2L9.5 8.5H3l5.5 4L6 19l6-4 6 4-2.5-6.5L21 8.5h-6.5L12 2z" /></svg> Premium active &nbsp;&middot;&nbsp; <span style={{ fontWeight: 500, color: "rgba(255,215,0,.7)" }}>{epUser.premiumExpiresAt ? `Expires ${new Date(epUser.premiumExpiresAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : "Lifetime"}</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: ".6rem", padding: ".55rem .9rem", borderRadius: 10, marginBottom: ".85rem", fontSize: ".8rem", fontWeight: 600, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.4)" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" /></svg> No active Premium
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: ".78rem", color: "rgba(255,255,255,.4)", margin: "0 0 .6rem" }}>Duration (days):</p>
                      <div style={{ display: "flex", gap: ".65rem", alignItems: "center", marginBottom: ".65rem" }}>
                        <input type="number" min={1} max={3650} value={premiumDaysInput} onChange={(e) => setPremiumDaysInput(e.target.value)} placeholder="Days (e.g. 30)"
                          style={{ flex: 1, padding: ".52rem .85rem", fontSize: ".85rem", borderRadius: 10, background: "rgba(255,215,0,.04)", border: "1px solid rgba(255,215,0,.25)", color: "#fff", outline: "none", boxSizing: "border-box" }} />
                        <button onClick={epGrantPremium} style={{ padding: ".52rem 1.2rem", borderRadius: 10, fontSize: ".82rem", fontWeight: 800, cursor: "pointer", border: "1px solid rgba(255,215,0,.4)", background: "linear-gradient(135deg,rgba(255,185,0,.2),rgba(255,215,0,.12))", color: "#ffd700", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: ".4rem" }}>
                          <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2L9.5 8.5H3l5.5 4L6 19l6-4 6 4-2.5-6.5L21 8.5h-6.5L12 2z" /></svg> {isActivePremium(epUser) ? "Extend Premium" : "Grant Premium"}
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginBottom: ".3rem" }}>
                        {[7, 30, 90, 180, 365].map((d) => (
                          <span key={d} onClick={() => setPremiumDaysInput(String(d))}
                            style={{ padding: ".22rem .65rem", borderRadius: 20, fontSize: ".72rem", fontWeight: 700, border: "1px solid rgba(255,215,0,.2)", background: "rgba(255,215,0,.05)", color: "rgba(255,215,0,.6)", cursor: "pointer" }}>{d}d</span>
                        ))}
                      </div>
                    </div>
                    {isActivePremium(epUser) && (
                      <div style={{ marginTop: ".6rem" }}>
                        <button onClick={epRevokePremium} style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", padding: ".52rem 1.2rem", borderRadius: 10, fontSize: ".82rem", fontWeight: 700, cursor: "pointer", border: "1px solid rgba(239,68,68,.35)", background: "rgba(239,68,68,.1)", color: "#ff8080" }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" /></svg> Revoke Premium
                        </button>
                      </div>
                    )}
                  </div>

                  {!epIsSelf && (
                    <div className="ep-section">
                      <div className="ep-section-head">
                        <div className="ep-section-ico" style={{ background: "rgba(57,255,20,.1)", color: "var(--accent)" }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                        </div>
                        <div>
                          <div className="ep-section-title">Manage Role</div>
                          <div className="ep-section-sub">Set the access level for this account</div>
                        </div>
                        <span className="ep-owner-tag">Owner</span>
                      </div>
                      <div className="ep-role-row">
                        {(["user", "mod", "admin", ...(props.canGrantOwner ? ["owner"] as const : [])] as const).map((r) => {
                          const active = roleKey(epUser) === r;
                          const styleMap: Record<string, { bg: string; border: string; color: string }> = {
                            user: { bg: "rgba(255,255,255,.06)", border: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.7)" },
                            mod: { bg: "rgba(168,85,247,.08)", border: "rgba(168,85,247,.35)", color: "#a855f7" },
                            admin: { bg: "rgba(57,255,20,.08)", border: "rgba(57,255,20,.3)", color: "var(--accent)" },
                            owner: { bg: "rgba(251,191,36,.08)", border: "rgba(251,191,36,.35)", color: "#fbbf24" },
                          };
                          const s = styleMap[r];
                          const label = r.charAt(0).toUpperCase() + r.slice(1);
                          return (
                            <button key={r} className="ep-role-btn" disabled={active} onClick={() => !active && epSetRole(r)}
                              style={{
                                padding: ".5rem 1rem", borderRadius: 10, fontSize: ".8rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: ".3rem", transition: "all .2s",
                                background: active ? s.bg : "rgba(255,255,255,.03)",
                                border: active ? `2px solid ${s.border}` : "1px solid rgba(255,255,255,.08)",
                                color: active ? s.color : "rgba(255,255,255,.35)",
                                opacity: 1, cursor: active ? "default" : "pointer",
                              }}>
                              {label}
                              {active && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12" style={{ marginLeft: 4 }}><path d="M20 6L9 17l-5-5" /></svg>}
                            </button>
                          );
                        })}
                      </div>
                      <p className="ep-role-note">{props.canGrantOwner ? `You are owner #${props.myOwnerRank} — you can promote to Owner.` : "Only the first 3 owners can assign the Owner role."}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Confirm modal */}
      <div className={`confirm-modal ${confirm ? "open" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) closeConfirm(); }}>
        <div className="confirm-box">
          <h3>{confirm?.title || "Confirm"}</h3>
          <p>{confirm?.text || "Are you sure?"}</p>
          <div className="confirm-actions">
            <button className="btn btn-secondary" onClick={closeConfirm}>Cancel</button>
            <button className="btn btn-danger" disabled={inFlight} style={{ opacity: inFlight ? .5 : 1 }} onClick={doConfirm}>{confirm?.btnLabel || "Confirm"}</button>
          </div>
        </div>
      </div>
    </>
  );
}
