import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import ViewsChart from "./ViewsChart";

function fmtDateShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  const isPremium = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const rangeStart = new Date(today);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 29);

  const viewsRaw = await prisma.viewsLog.groupBy({
    by: ["viewedAt"],
    where: { profileUserId: user.id, viewedAt: { gte: rangeStart } },
    _count: { _all: true },
  });
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
                <a href="/dashboard/shop#premium" style={{ fontSize: ".7rem", color: "var(--accent)", marginTop: 2, display: "block", textDecoration: "none" }}>Upgrade →</a>
              </>
            )}
          </div>
        </div>
      </div>

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
    </>
  );
}
