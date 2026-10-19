"use client";

import { useEffect, useRef, useState } from "react";
import SafeImg from "@/components/SafeImg";
import SpotlightCard from "@/components/ui/SpotlightCard";

type GlobalUser = { id: number; username: string; displayName: string; avatar: string; views: number; premium: boolean };
type LocalUser = { id: number; username: string; displayName: string; avatar: string; localViews: number; regionName: string; premium: boolean };
type LikesUser = { id: number; username: string; displayName: string; avatar: string; likeCount: number; premium: boolean };
type AnyUser = GlobalUser | LocalUser | LikesUser;
type Metric = "views" | "localViews" | "likes";

function fmtViews(v: number): string {
  return v >= 1000 ? `${Math.round((v / 1000) * 10) / 10}K` : String(v);
}

function metricValue(u: AnyUser, metric: Metric): number {
  if (metric === "views") return (u as GlobalUser).views;
  if (metric === "localViews") return (u as LocalUser).localViews;
  return (u as LikesUser).likeCount;
}

function PremBadge() {
  return (
    <span className="lb-prem-badge">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
        <path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.2)" stroke="#ffd700" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="#ffd700" strokeWidth="1.3" strokeLinejoin="round" opacity=".75" />
      </svg>
    </span>
  );
}

// Spotlight colour + card border per podium place (gold / silver / bronze).
const PODIUM_LIGHT: Record<string, { light: string; border: string }> = {
  p1: { light: "#ffd700", border: "rgba(200,151,10,.4)" },
  p2: { light: "#e4e4e7", border: "rgba(160,160,160,.28)" },
  p3: { light: "#e0a26b", border: "rgba(122,79,46,.35)" },
};

function Podium({ users, metric }: { users: AnyUser[]; metric: Metric }) {
  const order: { rank: number; cls: string; user: AnyUser | undefined }[] = [
    { rank: 2, cls: "p2", user: users[1] },
    { rank: 1, cls: "p1", user: users[0] },
    { rank: 3, cls: "p3", user: users[2] },
  ];
  return (
    <div className="lb-podium">
      {order.map((pod) =>
        pod.user ? (
          <div key={pod.cls} className={`lb-podium-slot ${pod.cls}`} onClick={() => window.open(`/${encodeURIComponent(pod.user!.username)}`, "_blank")}>
            <SpotlightCard
              className="lb-podium-card"
              spotlightColor={PODIUM_LIGHT[pod.cls].light}
              intensity={0.22}
              spotlightSize={220}
              softness={0.55}
              borderGlow={0.7}
              proximity={120}
              smoothing={0.35}
              style={{ "--spotlight-card-border": PODIUM_LIGHT[pod.cls].border } as React.CSSProperties}
            >
              <span className="lb-podium-rank">{pod.rank}</span>
              <SafeImg src={pod.user.avatar ? `/${pod.user.avatar}` : null} className="lb-podium-avatar" />
              <div className="lb-podium-name">
                {pod.user.premium ? (
                  <span className="lb-prem-badge-wrap">{pod.user.displayName || pod.user.username} <PremBadge /></span>
                ) : (
                  pod.user.displayName || pod.user.username
                )}
              </div>
              <div className="lb-podium-views">
                {metric === "likes" ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
                {fmtViews(metricValue(pod.user, metric))}
              </div>
            </SpotlightCard>
          </div>
        ) : null
      )}
    </div>
  );
}

function Table({
  users,
  metric,
  loggedIn,
  myUserId,
  emptyText,
}: {
  users: AnyUser[];
  metric: Metric;
  loggedIn: boolean;
  myUserId: number;
  emptyText: string;
}) {
  const rest = users.slice(3);
  if (users.length > 0 && rest.length === 0) return null;
  const metricLabel = metric === "views" ? "Views" : metric === "localViews" ? "Local Views" : "Likes";
  return (
    <div className="lb-table-wrap">
      <SpotlightCard className="lb-table-card" spotlightColor="#c4b5fd" intensity={0.1} spotlightSize={360} softness={0.8} borderGlow={0.5} proximity={60}>
      <table className="lb-table">
        <thead>
          <tr>
            <th style={{ width: 52 }}>#</th>
            <th>Profile</th>
            <th style={{ textAlign: "right" }}>{metricLabel}</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr><td colSpan={3} style={{ textAlign: "center", padding: "3rem", color: "rgba(255,255,255,.3)" }}>{emptyText}</td></tr>
          ) : (
            rest.map((u, i) => {
              const rank = i + 4;
              const isMe = loggedIn && u.id === myUserId;
              const value = metricValue(u, metric);
              return (
                <tr key={u.id} className={isMe ? "is-me" : ""} onClick={() => window.open(`/${encodeURIComponent(u.username)}`, "_blank")}>
                  <td><span className="lb-rank-num">{rank}</span></td>
                  <td>
                    <div className="lb-user-cell">
                      <SafeImg src={u.avatar ? `/${u.avatar}` : null} className="lb-avatar" />
                      <div>
                        <div className="lb-display-name" style={{ display: "flex", alignItems: "center", gap: ".4rem", flexWrap: "wrap" }}>
                          <span>{u.displayName || u.username}</span>
                          {u.premium && <PremBadge />}
                          {isMe && <span style={{ fontSize: ".7rem", color: "var(--accent)", fontWeight: 600 }}>YOU</span>}
                        </div>
                        <div className="lb-username">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="lb-views">{value.toLocaleString()}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      </SpotlightCard>
    </div>
  );
}

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
);
const HeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
);
const METRICS = [
  { key: "global", label: "Views", icon: <EyeIcon /> },
  { key: "likes", label: "Likes", icon: <HeartIcon /> },
] as const;

// Small dropdown that flips the board between total views and likes.
function MetricSwitch({ value, onChange }: { value: "global" | "local" | "likes"; onChange: (next: "global" | "likes") => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = METRICS.find((m) => m.key === value) ?? METRICS[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className="lb-metric" ref={ref}>
      <button type="button" className="lb-metric-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {current.icon}
        <span>{current.label}</span>
        <svg className="lb-metric-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && (
        <div className="lb-metric-menu" role="listbox">
          {METRICS.map((m) => (
            <button key={m.key} type="button" role="option" aria-selected={m.key === current.key} className={`lb-metric-opt${m.key === current.key ? " is-active" : ""}`} onClick={() => { onChange(m.key); setOpen(false); }}>
              {m.icon}
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LeaderboardTabs({
  globalUsers,
  localUsers,
  likesUsers,
  searchQuery,
  loggedIn,
  myUserId,
  myProfileExists,
  myRankGlobal,
  myViewsGlobal,
  myRegionCode,
  myRegionName,
  myRankLocal,
  myViewsLocal,
  badgeRegionName,
}: {
  globalUsers: GlobalUser[];
  localUsers: LocalUser[];
  likesUsers: LikesUser[];
  searchQuery: string;
  loggedIn: boolean;
  myUserId: number;
  myProfileExists: boolean;
  myRankGlobal: number;
  myViewsGlobal: number;
  myRegionCode: string;
  myRegionName: string;
  myRankLocal: number;
  myViewsLocal: number;
  badgeRegionName: string;
}) {
  const [tab, setTab] = useState<"global" | "local" | "likes">("global");
  const [fading, setFading] = useState(false);
  const [regionName, setRegionName] = useState(badgeRegionName);

  function switchTab(next: "global" | "local" | "likes") {
    if (next === tab) return;
    setFading(true);
    setTimeout(() => {
      setTab(next);
      setFading(false);
    }, 280);
  }

  useEffect(() => {
    if (regionName.trim() !== "") return;
    fetch("https://ip-api.com/json/?fields=country")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.country) {
          setRegionName(data.country);
          return;
        }
        throw new Error("no country");
      })
      .catch(() => {
        fetch("https://ipapi.co/json/")
          .then((r) => r.json())
          .then((data) => {
            if (data && data.country_name) setRegionName(data.country_name);
          })
          .catch(() => {});
      });
  }, [regionName]);

  const showRankPills = loggedIn && !searchQuery && myProfileExists;

  return (
    <>
      <div style={{ maxWidth: 900, margin: "0 auto 1rem", padding: "0 1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <MetricSwitch value={tab} onChange={switchTab} />
        </div>
        {showRankPills && (
          <div style={{ marginTop: ".9rem", textAlign: "center" }}>
            {tab === "global" ? (
              <div className="lb-rank-pill" style={{ display: "inline-flex" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ color: "var(--accent)", flexShrink: 0 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                You are ranked <strong>#{myRankGlobal.toLocaleString()}</strong> with {myViewsGlobal.toLocaleString()} global views{myRankGlobal > 100 && " — Keep growing!"}
              </div>
            ) : tab === "local" && myRegionCode && myRegionCode !== "XX" ? (
              <div className="lb-rank-pill" style={{ display: "inline-flex" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ color: "var(--accent)", flexShrink: 0 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                {myRankLocal > 0 ? (
                  <>You are ranked <strong>#{myRankLocal.toLocaleString()}</strong> in {myRegionName} with {myViewsLocal.toLocaleString()} local views</>
                ) : (
                  <>You have no local views yet in {myRegionName}. Keep going!</>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className={`lb-panel ${fading ? "fading" : ""}`}>
        {tab === "global" ? (
          <>
            {!searchQuery && globalUsers.length >= 1 && (
              <div className="lb-podium-wrap">
                <Podium users={globalUsers} metric="views" />
              </div>
            )}
            <Table users={globalUsers} metric="views" loggedIn={loggedIn} myUserId={myUserId} emptyText="No profiles yet." />
          </>
        ) : tab === "local" ? (
          <>
            {!searchQuery && localUsers.length >= 1 && (
              <div className="lb-podium-wrap">
                {regionName && (
                  <div style={{ textAlign: "center", marginBottom: ".85rem" }}>
                    <span className="lb-local-badge">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                      <span>{regionName}</span>
                    </span>
                  </div>
                )}
                <Podium users={localUsers} metric="localViews" />
              </div>
            )}

            {!loggedIn ? (
              <div className="lb-info-banner">
                <div className="lb-info-banner-card">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22" style={{ color: "var(--accent)", flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  <p>Login and set your region in Settings to appear in the Local leaderboard.</p>
                  <a href="/login" className="btn btn-primary btn-sm">Login</a>
                </div>
              </div>
            ) : (!myRegionCode || myRegionCode === "XX") ? (
              <div className="lb-info-banner">
                <div className="lb-info-banner-card">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22" style={{ color: "var(--accent)", flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  <p>Set your region in Settings to appear in the Local leaderboard.</p>
                  <a href="/dashboard?page=settings" className="btn btn-primary btn-sm">Set Region</a>
                </div>
              </div>
            ) : null}

            <Table users={localUsers} metric="localViews" loggedIn={loggedIn} myUserId={myUserId} emptyText="No users with a region set yet." />
          </>
        ) : (
          <>
            {!searchQuery && likesUsers.length >= 1 && (
              <div className="lb-podium-wrap">
                <Podium users={likesUsers} metric="likes" />
              </div>
            )}
            <Table users={likesUsers} metric="likes" loggedIn={loggedIn} myUserId={myUserId} emptyText="No liked profiles yet." />
          </>
        )}
      </div>

      <div className="lb-divider" aria-hidden="true" />
    </>
  );
}
