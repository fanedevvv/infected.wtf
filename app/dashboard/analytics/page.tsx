import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import AnalyticsClient from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isPremium = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());

  if (!isPremium) {
    return (
      <div className="pg-wrap">
        <div className="pg-card">
          <div className="pg-icon-ring">
            <svg viewBox="0 0 24 24" fill="none" stroke="#0a0806" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="38" height="38"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
          </div>
          <div className="pg-title">Analytics is Premium only</div>
          <p className="pg-desc">Upgrade to Premium to unlock detailed profile analytics — views by country, browser, device, and more.</p>
          <a href="/dashboard/shop#premium" className="pg-btn">Upgrade to Premium</a>
        </div>
      </div>
    );
  }

  return <AnalyticsClient />;
}
