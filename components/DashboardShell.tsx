"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ToastContainer from "./ToastContainer";
import { LabWordmark } from "./lab/LabMark";
import { LanguagePicker, ThemePicker } from "./DashPrefs";
import { useT } from "@/lib/i18n/client";
import { applyDashTheme, clearDashTheme, type DashMode } from "@/lib/dash-theme";

type Me = {
  username: string;
  isAdmin: boolean;
  isOwner: boolean;
  isMod: boolean;
  tokens: number;
};
type ProfileMini = { avatar: string | null; displayName: string | null; isPremium?: boolean };
type PageInfo = { id: number; slug: string; displayName: string | null; avatar: string | null; isPrimary: boolean };

function SidebarLink({ href, active, icon, children }: { href: string; active: boolean; icon: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`sidebar-link ${active ? "active" : ""}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d={icon} />
      </svg>
      {children}
    </Link>
  );
}

export default function DashboardShell({ children, initialMode, initialAccent }: { children: React.ReactNode; initialMode: DashMode; initialAccent: string }) {
  const t = useT();
  const [themeMode, setThemeMode] = useState<DashMode>(initialMode);
  const [themeAccent, setThemeAccent] = useState(initialAccent);

  useEffect(() => {
    applyDashTheme(themeMode, themeAccent);
  }, [themeMode, themeAccent]);
  useEffect(() => clearDashTheme, []);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activePage = searchParams.get("page") || "overview";
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState<ProfileMini | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<{ id: number; type: string; title: string; body: string | null; icon: string; link: string | null; isRead: boolean; createdAt: string }[]>([]);
  const [unread, setUnread] = useState(0);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null);
  const userWrapRef = useRef<HTMLDivElement>(null);
  const bellWrapRef = useRef<HTMLDivElement>(null);

  function loadMe() {
    fetch("/api/me").then((r) => r.json()).then((d) => {
      setMe(d.user);
      setProfile(d.profile);
      setPages(d.pages || []);
      setActiveProfileId(d.activeProfileId ?? null);
    });
  }

  // Pages that change the balance/profile (e.g. the daily spin) fire this so the navbar doesn't go stale.
  useEffect(() => {
    window.addEventListener("dash:refresh-me", loadMe);
    return () => window.removeEventListener("dash:refresh-me", loadMe);
  }, []);

  useEffect(() => {
    loadMe();
    loadNotifs();
    const interval = setInterval(loadNotifs, 60000);
    return () => clearInterval(interval);
  }, []);

  async function loadNotifs() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setNotifs(data.notifications || []);
    setUnread(data.unread || 0);
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (userWrapRef.current && !userWrapRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (bellWrapRef.current && !bellWrapRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read_all" }),
    });
    setUnread(0);
    loadNotifs();
  }

  async function openNotif(id: number) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read_one", id }),
    });
    const n = notifs.find((x) => x.id === id);
    if (n?.link) router.push(n.link);
    loadNotifs();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isModerator = !!(me && (me.isMod || me.isAdmin || me.isOwner));

  return (
    <>
      <nav className="navbar navbar-dashboard">
        <div className="navbar-left">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen((s) => !s)} aria-label="Toggle sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="20" height="20">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
        <div className="navbar-dash-right" style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <LanguagePicker />
          <ThemePicker mode={themeMode} accent={themeAccent} onChange={(m, a) => { setThemeMode(m); setThemeAccent(a); }} />
          <div ref={bellWrapRef} style={{ position: "relative" }}>
            <button
              onClick={() => { setNotifOpen((o) => !o); if (!notifOpen) loadNotifs(); }}
              title="Notifications"
              className="dash-icon-btn"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unread > 0 && <span className="notif-badge">{Math.min(unread, 99)}</span>}
            </button>
            {notifOpen && (
              <div className="notif-dropdown">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".9rem 1rem .7rem", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                  <span style={{ fontSize: ".9rem", fontWeight: 700, color: "#fff" }}>{t("Notifications")}</span>
                  <button onClick={markAllRead} style={{ fontSize: ".72rem", color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>{t("Mark all read")}</button>
                </div>
                <div style={{ maxHeight: 280, overflowY: "auto" }}>
                  {notifs.length === 0 ? (
                    <div style={{ textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: ".8rem", padding: "1.5rem 1rem" }}>{t("No notifications yet")}</div>
                  ) : (
                    notifs.map((n) => (
                      <div key={n.id} className={`notif-item ${!n.isRead ? "unread" : ""}`} onClick={() => openNotif(n.id)}>
                        <div className="notif-item-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="notif-item-title">{n.title}</div>
                          {n.body && <div className="notif-item-body">{n.body}</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div style={{ padding: ".6rem 1rem", borderTop: "1px solid rgba(255,255,255,.06)", textAlign: "center" }}>
                  <span style={{ fontSize: ".72rem", color: "rgba(255,255,255,.3)" }}>{t("Last 5 notifications")}</span>
                </div>
              </div>
            )}
          </div>

          <Link href="/dashboard?page=shop" className="navbar-tokens" title="Go to Shop">
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" /></svg>
            <span>{me?.tokens ?? 0}</span>
          </Link>

          <div className="navbar-user-wrap" ref={userWrapRef}>
            {userMenuOpen && (
              <div className="navbar-user-menu" style={{ display: "flex" }}>
                <a href={`/${me?.username ?? ""}`} target="_blank" className="navbar-menu-item" rel="noreferrer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>{t("My Profile")}</a>
                <a href="#" className="navbar-menu-item" onClick={(e) => { e.preventDefault(); setUserMenuOpen(false); setAccountsOpen(true); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>{t("Manage Accounts")}</a>
                <Link href="/dashboard?page=settings" className="navbar-menu-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="12" cy="12" r="3" /></svg>{t("Settings")}</Link>
                <div style={{ height: 1, background: "rgba(255,255,255,.07)", margin: ".2rem 0" }} />
                <a href="#" className="navbar-menu-item navbar-menu-logout" onClick={(e) => { e.preventDefault(); logout(); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>{t("Logout")}</a>
              </div>
            )}
            <div className="navbar-user-card" onClick={() => setUserMenuOpen((o) => !o)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile?.avatar ? `/${profile.avatar}` : "/assets/img/default-avatar.png"}
                onError={(e) => { (e.target as HTMLImageElement).src = "/assets/img/default-avatar.png"; }}
                className="navbar-user-avatar"
                alt=""
              />
              <div className="navbar-user-info">
                <span className={`navbar-user-name ${profile?.isPremium ? "navbar-user-name--premium" : ""}`}>
                  {profile?.displayName || me?.username}
                </span>
                <span className="navbar-user-sub">{t("Profile")}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="dashboard-layout">
        <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`} id="sidebar">
          <div className="sidebar-logo-wrap">
            <Link href="/dashboard" className="sidebar-logo" aria-label="infected.wtf dashboard">
              <LabWordmark />
            </Link>
          </div>

          {pages.length > 0 && (
            <div className="page-switch-wrap">
              {(() => {
                const active = pages.find((p) => p.id === activeProfileId) || pages[0];
                return (
                  <div className="page-switch-btn" style={{ cursor: "default" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={active.avatar ? `/${active.avatar}` : "/assets/img/default-avatar.png"}
                      onError={(e) => { (e.target as HTMLImageElement).src = "/assets/img/default-avatar.png"; }}
                      className="page-switch-avatar"
                      alt=""
                    />
                    <div className="page-switch-info">
                      <span className="page-switch-name">{active.displayName || active.slug}</span>
                      <span className="page-switch-slug">infected.wtf/{active.slug}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {isModerator && (
            <>
              <span className="sidebar-label">{t("Staff")}</span>
              <SidebarLink href="/admin" active={pathname === "/admin"} icon="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z">{t("Admin Panel")}</SidebarLink>
            </>
          )}

          <span className="sidebar-label">{t("Main")}</span>
          <SidebarLink href="/dashboard" active={pathname === "/dashboard" && activePage === "overview"} icon="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z">{t("Dashboard")}</SidebarLink>
          <SidebarLink href="/leaderboard" active={pathname === "/leaderboard"} icon="M18 20V10M12 20V4M6 20v-6">{t("Leaderboard")}</SidebarLink>
          <SidebarLink href="/dashboard?page=analytics" active={activePage === "analytics"} icon="M22 12h-4l-3 9L9 3l-3 9H2">{t("Analytics")}</SidebarLink>
          <SidebarLink href="/dashboard?page=shop" active={activePage === "shop"} icon="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0">{t("Shop")}</SidebarLink>
          <SidebarLink href="/dashboard?page=marketplace" active={activePage === "marketplace"} icon="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5">{t("Marketplace")}</SidebarLink>

          <span className="sidebar-label">{t("Store")}</span>
          <SidebarLink href="/dashboard?page=spin" active={activePage === "spin"} icon="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
            {t("Daily Spin")} <span className="sidebar-new-badge">{t("NEW")}</span>
          </SidebarLink>
          <SidebarLink href="/dashboard?page=decorations" active={activePage === "decorations"} icon="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.6h7.6z">{t("Decorations")}</SidebarLink>
          <SidebarLink href="/dashboard?page=premium" active={activePage === "premium"} icon="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm2.07-7.75-.9.92C13.45 11.9 13 12.5 13 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z">{t("Infected Plus")}</SidebarLink>

          <span className="sidebar-label">{t("Profile")}</span>
          <SidebarLink href="/dashboard?page=editor" active={activePage === "editor" || activePage === "info"} icon="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z">{t("Customize")}</SidebarLink>
          <SidebarLink href="/dashboard?page=badges" active={activePage === "badges"} icon="M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89 7 23l5-3 5 3-1.21-9.12">{t("Badges")}</SidebarLink>
          <SidebarLink href="/dashboard?page=links" active={activePage === "links"} icon="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71">{t("Links")}</SidebarLink>
          <SidebarLink href="/dashboard?page=projects" active={activePage === "projects"} icon="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z">{t("Projects")}</SidebarLink>
          <SidebarLink href="/dashboard?page=images" active={activePage === "images"} icon="M3 3h18v18H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21">{t("Image Host")}</SidebarLink>
          <SidebarLink href="/dashboard?page=referral" active={activePage === "referral"} icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75">{t("Referral")}</SidebarLink>
          <SidebarLink href="/dashboard?page=effects" active={activePage === "effects"} icon="M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2">{t("Effects")}</SidebarLink>
          <SidebarLink href="/dashboard?page=integrations" active={activePage === "integrations"} icon="M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01M9 7h6M9 11h6">{t("Integrations")}</SidebarLink>
        </aside>
        <div className={`sidebar-overlay ${sidebarOpen ? "active" : ""}`} onClick={() => setSidebarOpen(false)} />

        <main className="dashboard-main">{children}</main>
      </div>

      <nav className="mobile-bottom-nav">
        <div className="mobile-nav-scroll">
          {isModerator && (
            <Link href="/admin" className={`mobile-nav-item ${pathname === "/admin" ? "active" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              <span>{me?.isOwner ? "Owner" : "Admin"}</span>
            </Link>
          )}
          <Link href="/dashboard" className={`mobile-nav-item ${pathname === "/dashboard" && activePage === "overview" ? "active" : ""}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
            <span>{t("Home")}</span>
          </Link>
          <Link href="/dashboard?page=links" className={`mobile-nav-item ${activePage === "links" ? "active" : ""}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
            <span>{t("Links")}</span>
          </Link>
          <Link href="/dashboard?page=editor" className={`mobile-nav-item ${activePage === "editor" || activePage === "info" ? "active" : ""}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /></svg>
            <span>{t("Style")}</span>
          </Link>
          <Link href="/dashboard?page=analytics" className={`mobile-nav-item ${activePage === "analytics" ? "active" : ""}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            <span>{t("Stats")}</span>
          </Link>
          <Link href="/dashboard?page=badges" className={`mobile-nav-item ${activePage === "badges" ? "active" : ""}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" /></svg>
            <span>{t("Badges")}</span>
          </Link>
          <Link href="/dashboard?page=effects" className={`mobile-nav-item ${activePage === "effects" ? "active" : ""}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            <span>{t("Effects")}</span>
          </Link>
          <Link href="/dashboard?page=referral" className={`mobile-nav-item ${activePage === "referral" ? "active" : ""}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
            <span>{t("Referral")}</span>
          </Link>
          <Link href="/dashboard?page=shop" className={`mobile-nav-item ${activePage === "shop" ? "active" : ""}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /></svg>
            <span>{t("Shop")}</span>
          </Link>
        </div>
      </nav>

      {accountsOpen && (
        <ManageAccountsModal currentUsername={me?.username || ""} currentAvatar={profile?.avatar || null} onClose={() => setAccountsOpen(false)} />
      )}

      <ToastContainer />
    </>
  );
}

function ManageAccountsModal({ currentUsername, currentAvatar, onClose }: { currentUsername: string; currentAvatar: string | null; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const [accounts, setAccounts] = useState<{ username: string; token: string; avatar: string | null }[]>([]);
  const [adding, setAdding] = useState(false);
  const [login, setLogin] = useState("");
  const [pw, setPw] = useState("");
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem("bf_saved_accounts") || "[]");
      setAccounts(all.filter((a: { username: string }) => a.username !== currentUsername));
    } catch {
      setAccounts([]);
    }
  }, [currentUsername]);

  function saveAccounts(list: typeof accounts) {
    const all = JSON.parse(localStorage.getItem("bf_saved_accounts") || "[]");
    const others = all.filter((a: { username: string }) => a.username === currentUsername);
    localStorage.setItem("bf_saved_accounts", JSON.stringify([...others, ...list]));
    setAccounts(list);
  }

  async function addAccount() {
    if (!login || !pw) {
      setStatus({ text: "Fill in all fields", ok: false });
      return;
    }
    setStatus({ text: "Logging in...", ok: true });
    try {
      const res = await fetch("/api/accounts/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password: pw }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.username === currentUsername || accounts.find((a) => a.username === data.username)) {
          setStatus({ text: "Account already added", ok: false });
          return;
        }
        saveAccounts([...accounts, { username: data.username, token: data.switchToken, avatar: data.avatar }]);
        setStatus({ text: "Account saved!", ok: true });
        setTimeout(() => setAdding(false), 900);
      } else {
        setStatus({ text: data.error || "Invalid credentials", ok: false });
      }
    } catch {
      setStatus({ text: "Network error", ok: false });
    }
  }

  async function switchTo(username: string) {
    const idx = accounts.findIndex((a) => a.username === username);
    if (idx < 0) return;
    try {
      const res = await fetch("/api/accounts/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: accounts[idx].token }),
      });
      const data = await res.json();
      if (data.success) {
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 400);
      } else {
        const next = accounts.filter((a) => a.username !== username);
        saveAccounts(next);
      }
    } catch {
      /* network error */
    }
  }

  function remove(username: string) {
    saveAccounts(accounts.filter((a) => a.username !== username));
  }

  return (
    <div className="lab-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 9999 }}>
      <div className="lab-modal" style={{ maxHeight: "80vh", overflowY: "auto" }}>
        <button onClick={onClose} className="lab-modal-close" aria-label="Close">✕</button>
        <span className="lab-label"><span className="lab-dot" /> {t("Manage Accounts")}</span>
        <div className="lab-modal-sub" style={{ marginTop: ".6rem" }}>{t("Switch between multiple accounts")}</div>

        <div style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".65rem .75rem", background: "color-mix(in srgb, var(--accent) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", marginBottom: ".5rem" }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: "var(--panel-2)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {currentAvatar && <img src={`/${currentAvatar}`} alt="" style={{ width: 38, height: 38, objectFit: "cover" }} />}
          </div>
          <div>
            <div style={{ fontSize: ".85rem", fontWeight: 600, color: "#fff" }}>@{currentUsername}</div>
            <div style={{ fontSize: ".7rem", color: "var(--accent)" }}>● Active account</div>
          </div>
        </div>

        {accounts.map((a) => (
          <div key={a.username} style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".65rem .75rem", border: "1px solid var(--border)", marginBottom: ".4rem" }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: "var(--panel-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: 700 }}>
              {a.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.avatar} alt="" style={{ width: 38, height: 38, objectFit: "cover" }} />
              ) : (
                a.username.charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: ".85rem", fontWeight: 600, color: "#fff" }}>@{a.username}</div>
              <div style={{ fontSize: ".7rem", color: "var(--text-muted)" }}>{t("Saved account")}</div>
            </div>
            <div style={{ display: "flex", gap: ".4rem" }}>
              <button onClick={() => switchTo(a.username)} className="btn btn-secondary btn-xs">{t("Switch")}</button>
              <button onClick={() => remove(a.username)} className="btn btn-danger btn-xs">{t("Remove")}</button>
            </div>
          </div>
        ))}

        {adding ? (
          <div style={{ display: "flex", flexDirection: "column", gap: ".75rem", marginTop: ".75rem" }}>
            <input className="form-control" placeholder={t("Username or email")} value={login} onChange={(e) => setLogin(e.target.value)} />
            <input className="form-control" type="password" placeholder={t("Password")} value={pw} onChange={(e) => setPw(e.target.value)} />
            <button onClick={addAccount} className="btn btn-primary btn-full">{t("Log in & save account")}</button>
            {status && <div style={{ textAlign: "center", fontSize: ".8rem", color: status.ok ? "#34d399" : "#ff8080" }}>{status.text}</div>}
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="btn btn-primary btn-full" style={{ marginTop: ".75rem" }}>
            {t("+ Add an account")}
          </button>
        )}
        <p style={{ fontSize: ".7rem", color: "var(--text-muted)", marginTop: ".55rem", textAlign: "center" }}>
          {t("Accounts are saved locally in your browser.")}
        </p>
      </div>
    </div>
  );
}
