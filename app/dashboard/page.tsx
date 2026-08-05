import OverviewContent from "./OverviewContent";
import ProfileInfoPage from "./info/page";
import EffectsPage from "./effects/page";
import ShopPage from "./shop/page";
import MarketplacePage from "./marketplace/page";
import IntegrationsPage from "./integrations/page";
import BadgesPage from "./badges/page";
import LinksPage from "./links/page";
import ReferralPage from "./referral/page";
import AnalyticsPage from "./analytics/page";
import SettingsPage from "./settings/page";
import DecorationsPage from "./decorations/page";
import SpinPage from "./spin/page";
import PremiumPage from "./premium/page";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; error?: string; connected?: string; rp?: string }>;
}) {
  const params = await searchParams;
  const page = params.page || "overview";

  switch (page) {
    case "info":
      return <ProfileInfoPage searchParams={Promise.resolve(params)} />;
    case "effects":
      return <EffectsPage />;
    case "shop":
      return <ShopPage />;
    case "marketplace":
      return <MarketplacePage />;
    case "integrations":
      return <IntegrationsPage searchParams={Promise.resolve({ error: params.error, connected: params.connected })} />;
    case "badges":
      return <BadgesPage />;
    case "links":
      return <LinksPage />;
    case "referral":
      return <ReferralPage searchParams={Promise.resolve({ rp: params.rp })} />;
    case "analytics":
      return <AnalyticsPage />;
    case "settings":
      return <SettingsPage />;
    case "decorations":
      return <DecorationsPage />;
    case "spin":
      return <SpinPage />;
    case "premium":
      return <PremiumPage />;
    default:
      return <OverviewContent />;
  }
}
