import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/active-profile";
import ViewsChart from "./ViewsChart";
import RedeemCodeCard from "./RedeemCodeCard";

function fmtDateShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export default async function OverviewContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeProfileId = await getActiveProfileId(user.id);
  const profile = await prisma.profile.findUnique({ where: { id: activeProfileId } });
  const isPremium = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const rangeStart = new Date(today);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 29);

  const [viewsRaw, likeCount, recentNotifs] = await Promise.all([
    prisma.viewsLog.groupBy({
      by: ["viewedAt"],
      where: { profileUserId: user.id, viewedAt: { gte: rangeStart } },
      _count: { _all: true },
    }),
    prisma.profileLike.count({ where: { profileUserId: user.id } }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  const viewsMap = new Map<string, number>();
  for (const row of viewsRaw) {
    viewsMap.set(row.viewedAt.toISOString().slice(0, 10), row._count._all);
  }

  const labels: string[] = [];
  const data: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    labels.push(fmtDateShort(d));
    data.push(viewsMap.get(key) ?? 0);
  }
  const totalIn30Days = data.reduce((a, b) => a + b, 0);
  const dailyAvg = Math.round((totalIn30Days / 30) * 10) / 10;

  return (
    <>
      <div className="section-header">
        <h2>Welcome back, {profile?.displayName || user.username}</h2>
        <p>Here&apos;s an overview of your account and profile activity.</p>
      </div>

      <div className="overview-cards">
        <div className="overview-card">
          <div className="ov-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </div>
          <div className="ov-info">
            <div className="ov-label">Username</div>
            <div className="ov-value">{user.username}</div>
          </div>
        </div>
        <div className="overview-card">
          <div className="ov-icon ov-icon-hash">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>
          </div>
          <div className="ov-info">
            <div className="ov-label">UID</div>
            <div className="ov-value">{user.id}</div>
          </div>
        </div>
        <div className="overview-card">
          <div className="ov-icon ov-icon-eye">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          </div>
          <div className="ov-info">
            <div className="ov-label">Profile Views</div>
            <div className="ov-value">{(profile?.views ?? 0).toLocaleString()}</div>
          </div>
        </div>
        <div className="overview-card">
          <div className="ov-icon" style={{ color: "var(--accent)" }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" /></svg>
          </div>
          <div className="ov-info">
            <div className="ov-label">Tokens</div>
            <div className="ov-value">{user.tokens.toLocaleString()}</div>
          </div>
        </div>
        <div className="overview-card">
          <div className="ov-icon" style={{ color: "#fb7185" }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 21s-6.7-4.35-9.3-8.2C1.1 10.3 1.6 6.9 4.3 5.2c2.2-1.4 5-.8 6.6 1.2l1.1 1.3 1.1-1.3c1.6-2 4.4-2.6 6.6-1.2 2.7 1.7 3.2 5.1 1.6 7.6C18.7 16.65 12 21 12 21z" /></svg>
          </div>
          <div className="ov-info">
            <div className="ov-label">Likes</div>
            <div className="ov-value">{likeCount.toLocaleString()}</div>
          </div>
        </div>
        <div className={`overview-card ${isPremium ? "ov-card-premium" : ""}`}>
          <div className={`ov-icon ${isPremium ? "ov-icon-premium" : "ov-icon-hash"}`}>
            {isPremium ? (
              <svg viewBox="0 0 24 24" fill="none" width="22" height="22" style={{ filter: "drop-shadow(0 0 5px rgba(255,215,0,.9))" }}>
                <path d="M2.5 9L7 3h10l4.5 6L12 21 2.5 9z" fill="rgba(255,215,0,.3)" stroke="#ffd700" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M2.5 9h19M7 3l3 6h4l3-6" stroke="#ffd700" strokeWidth="1.4" strokeLinejoin="round" opacity=".85" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
            )}
          </div>
          <div className="ov-info">
            <div className="ov-label">Plan</div>
            {isPremium ? (
              <>
                <div className="ov-value" style={{ color: "#ffd700" }}>Premium</div>
                {user.premiumExpiresAt && (
                  <div style={{ fontSize: ".7rem", color: "rgba(255,215,0,.5)", marginTop: 2 }}>
                    Expires {user.premiumExpiresAt.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="ov-value">Free</div>
                <a href="/dashboard?page=shop#premium" style={{ fontSize: ".7rem", color: "var(--accent)", marginTop: 2, display: "block", textDecoration: "none" }}>Upgrade →</a>
              </>
            )}
          </div>
        </div>
      </div>

      <RedeemCodeCard />

      <div className="dash-card" style={{ marginTop: "1.5rem" }}>
        <div className="dash-card-header">
          <span className="dash-card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
            Profile Visitors
          </span>
          <span className="views-range-badge">Last 30 Days</span>
        </div>

        <div className="views-summary">
          <div className="views-tracked-block">
            <span className="views-big">{(profile?.views ?? 0).toLocaleString()}</span>
            <span className="views-badge">Tracked</span>
            <div className="views-tracked-label">Views Tracked</div>
          </div>
        </div>

        <ViewsChart labels={labels} data={data} />

        <div className="views-footer">
          <span className="views-footer-main">Visitors last 30 days: <strong>{totalIn30Days}</strong></span>
          <span className="views-footer-sub">Daily average: {dailyAvg} visitors/day</span>
        </div>
      </div>

      <div className="dash-card" style={{ marginTop: "1.5rem" }}>
        <div className="dash-card-header">
          <span className="dash-card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
            Quick Links
          </span>
        </div>
        <div className="quick-links-grid">
            <a href="/dashboard?page=info" className="quick-link-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>
              <span>Customize</span>
            </a>
            <a href="/dashboard?page=effects" className="quick-link-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              <span>Effects</span>
            </a>
            <a href="/dashboard?page=shop" className="quick-link-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" /></svg>
              <span>Shop</span>
            </a>
            <a href="/dashboard?page=marketplace" className="quick-link-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
              <span>Marketplace</span>
            </a>
            <a href="/dashboard?page=badges" className="quick-link-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89 7 23l5-3 5 3-1.21-9.12" /></svg>
              <span>Badges</span>
            </a>
            <a href="/dashboard?page=links" className="quick-link-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
              <span>Links</span>
            </a>
            <a href="/dashboard?page=referral" className="quick-link-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              <span>Referral</span>
            </a>
            <a href="/dashboard?page=integrations" className="quick-link-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01M9 7h6M9 11h6" /></svg>
              <span>Integrations</span>
            </a>
            <a href="/leaderboard" className="quick-link-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>
              <span>Leaderboard</span>
            </a>
        </div>
      </div>

      <div className="dash-card" style={{ marginTop: "1.5rem" }}>
        <div className="dash-card-header">
          <span className="dash-card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            Recent Updates
          </span>
        </div>
        {recentNotifs.length === 0 ? (
          <p style={{ fontSize: ".82rem", color: "var(--text-muted)", padding: ".5rem 0" }}>No updates yet — activity on your profile will show up here.</p>
        ) : (
          <div className="updates-feed">
            {recentNotifs.map((n) => (
              <div key={n.id} className="updates-feed-item">
                <div className="updates-feed-dot" />
                <div>
                  <div className="updates-feed-title">{n.title}</div>
                  {n.body && <div className="updates-feed-body">{n.body}</div>}
                  <div className="updates-feed-time">{n.createdAt.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
