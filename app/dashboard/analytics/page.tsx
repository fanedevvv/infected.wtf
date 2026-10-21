import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import AnalyticsClient from "./AnalyticsClient";
import { getT } from "@/lib/i18n/server";

export default async function AnalyticsPage() {
  const t = await getT();
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
          <div className="pg-title">{t("Analytics is Infected Plus only")}</div>
          <p className="pg-desc">{t("Upgrade to Infected Plus to unlock detailed profile analytics — views by country, browser, device, and more.")}</p>
          <a href="/dashboard?page=shop#premium" className="pg-btn">{t("Upgrade to Infected Plus")}</a>
        </div>
      </div>
    );
  }

  return <AnalyticsClient />;
}
