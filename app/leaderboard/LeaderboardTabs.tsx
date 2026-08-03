"use client";

import { useEffect, useState } from "react";
import SafeImg from "@/components/SafeImg";

type GlobalUser = { id: number; username: string; displayName: string; avatar: string; views: number; premium: boolean };
type LocalUser = { id: number; username: string; displayName: string; avatar: string; localViews: number; regionName: string; premium: boolean };

function fmtViews(v: number): string {
  return v >= 1000 ? `${Math.round((v / 1000) * 10) / 10}K` : String(v);
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

function Podium({ users, metric }: { users: (GlobalUser | LocalUser)[]; metric: "views" | "localViews" }) {
  const order: { rank: number; cls: string; user: GlobalUser | LocalUser | undefined }[] = [
    { rank: 2, cls: "p2", user: users[1] },
    { rank: 1, cls: "p1", user: users[0] },
    { rank: 3, cls: "p3", user: users[2] },
  ];
  return (
    <div className="lb-podium">
      {order.map((pod) =>
        pod.user ? (
          <div key={pod.cls} className={`lb-podium-slot ${pod.cls}`} onClick={() => window.open(`/${encodeURIComponent(pod.user!.username)}`, "_blank")}>
            <div className="lb-podium-card">
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                {fmtViews(metric === "views" ? (pod.user as GlobalUser).views : (pod.user as LocalUser).localViews)}
              </div>
            </div>
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
  users: (GlobalUser | LocalUser)[];
  metric: "views" | "localViews";
  loggedIn: boolean;
  myUserId: number;
  emptyText: string;
}) {
  const rest = users.slice(3);
  return (
    <div className="lb-table-wrap">
      <table className="lb-table">
        <thead>
          <tr>
            <th style={{ width: 52 }}>#</th>
            <th>Profile</th>
            <th style={{ textAlign: "right" }}>{metric === "views" ? "Views" : "Local Views"}</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr><td colSpan={3} style={{ textAlign: "center", padding: "3rem", color: "rgba(255,255,255,.3)" }}>{emptyText}</td></tr>
          ) : (
            rest.map((u, i) => {
              const rank = i + 4;
              const isMe = loggedIn && u.id === myUserId;
              const value = metric === "views" ? (u as GlobalUser).views : (u as LocalUser).localViews;
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
    </div>
  );
}

export default function LeaderboardTabs({
  globalUsers,
  localUsers,
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
  const [tab, setTab] = useState<"global" | "local">("global");
  const [fading, setFading] = useState(false);
  const [regionName, setRegionName] = useState(badgeRegionName);

  function switchTab(next: "global" | "local") {
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div className="lb-tab-switch">
            <button className={`lb-tab-btn ${tab === "global" ? "active" : ""}`} onClick={() => switchTab("global")}>Global</button>
            <button className={`lb-tab-btn ${tab === "local" ? "active" : ""}`} onClick={() => switchTab("local")}>Local</button>
          </div>
        </div>
        {showRankPills && (
          <div style={{ marginTop: ".75rem" }}>
            {tab === "global" ? (
              <div className="lb-rank-pill" style={{ display: "inline-flex" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ color: "var(--accent)", flexShrink: 0 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                You are ranked <strong>#{myRankGlobal.toLocaleString()}</strong> with {myViewsGlobal.toLocaleString()} global views{myRankGlobal > 100 && " — Keep growing!"}
              </div>
            ) : myRegionCode && myRegionCode !== "XX" ? (
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
        ) : (
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
                  <a href="/dashboard/settings" className="btn btn-primary btn-sm">Set Region</a>
                </div>
              </div>
            ) : null}

            <Table users={localUsers} metric="localViews" loggedIn={loggedIn} myUserId={myUserId} emptyText="No users with a region set yet." />
          </>
        )}
      </div>
    </>
  );
}
