const TABS = [
  { id: "media", label: "Media" },
  { id: "appearance", label: "Appearance" },
  { id: "layout", label: "Layout" },
  { id: "badges", label: "Badges" },
  { id: "integrations", label: "Integrations" },
];

export function AppearanceTabBar({ activeTab }: { activeTab: string }) {
  return (
    <div className="appr-tabbar">
      {TABS.map((t) => (
        <a key={t.id} href={`/dashboard?page=info&tab=${t.id}`} className={`appr-tab ${activeTab === t.id ? "active" : ""}`}>
          {t.label}
        </a>
      ))}
    </div>
  );
}

export type SubNavItem = { id: string; label: string; icon: React.ReactNode };

export function AppearanceSubNav({ tab, items, activeSub }: { tab: string; items: SubNavItem[]; activeSub: string }) {
  return (
    <div className="appr-subnav">
      {items.map((it) => (
        <a key={it.id} href={`/dashboard?page=info&tab=${tab}&sub=${it.id}`} className={`appr-subnav-item ${activeSub === it.id ? "active" : ""}`}>
          {it.icon}
          <span>{it.label}</span>
        </a>
      ))}
    </div>
  );
}
