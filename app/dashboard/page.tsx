import { redirect } from "next/navigation";
import OverviewContent from "./OverviewContent";
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
import ProjectsPage from "./projects/page";
import EditorPage from "./editor/page";
import ImagesPage from "./images/page";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; error?: string; connected?: string; rp?: string; tile?: string }>;
}) {
  const params = await searchParams;
  const page = params.page || "overview";

  switch (page) {
    case "info":
      // The old Appearance page was replaced by the tile-based editor; keep old links working.
      redirect("/dashboard?page=editor");
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
    case "projects":
      return <ProjectsPage />;
    case "images":
      return <ImagesPage />;
    case "editor":
      return <EditorPage searchParams={Promise.resolve({ tile: params.tile, error: params.error, connected: params.connected })} />;
    default:
      return <OverviewContent />;
  }
}
