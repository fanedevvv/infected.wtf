import type { Metadata } from "next";
import { getSiteStats, type Share } from "@/lib/site-stats";
import DailyChart from "@/components/stats/DailyChart";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stats | INFECTED.WTF",
  description: "Live numbers for infected.wtf — users, pages, profile views and more.",
};

const SITE = "https://infected.wtf";

function BarList({ title, rows, unit }: { title: string; rows: Share[]; unit: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <section className="st-card">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="st-empty">No data yet</p>
      ) : (
        <ul className="st-bars">
          {rows.map((r) => (
            <li key={r.label} title={`${r.label}: ${r.value.toLocaleString()} ${unit}`}>
              <div className="st-bar-head">
                <span className="st-bar-label">{r.label}</span>
                <span className="st-bar-value">{r.value.toLocaleString()} <em>{total ? Math.round((r.value / total) * 100) : 0}%</em></span>
              </div>
              <div className="st-bar-track"><span style={{ width: `${(r.value / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Avatar({ src }: { src: string | null }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src ? `${SITE}/${src}` : `${SITE}/assets/img/default-avatar.png`} alt="" loading="lazy" />;
}

export default async function SiteStatsPage() {
  const s = await getSiteStats();
  const tiles = [
    { label: "Accounts", value: s.totals.users, sub: `+${s.today.signups} today` },
    { label: "Pages", value: s.totals.pages, sub: "bio pages created" },
    { label: "Profile views", value: s.totals.views, sub: `+${s.today.views} today` },
    { label: "Link clicks", value: s.totals.linkClicks, sub: "all time" },
    { label: "Likes", value: s.totals.likes, sub: "on profiles" },
    { label: "Comments", value: s.totals.comments, sub: "on profiles" },
    { label: "Projects", value: s.totals.projects, sub: "approved" },
    { label: "Infected Plus", value: s.totals.plus, sub: "active members" },
  ];

  return (
    <main className="st-page">
      <header className="st-header">
        <a href={SITE} className="st-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${SITE}/assets/img/logo-icon.png`} alt="" />
          <span>infected.wtf</span>
          <b>stats</b>
        </a>
        <span className="st-live"><i />Live · updated {new Date(s.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC</span>
      </header>

      <section className="st-hero">
        <h1>{s.totals.views.toLocaleString()}</h1>
        <p>profile views across {s.totals.pages.toLocaleString()} pages</p>
      </section>

      <section className="st-tiles">
        {tiles.map((t) => (
          <div className="st-tile" key={t.label}>
            <span className="st-tile-label">{t.label}</span>
            <span className="st-tile-value">{t.value.toLocaleString()}</span>
            <span className="st-tile-sub">{t.sub}</span>
          </div>
        ))}
      </section>

      <section className="st-grid-2">
        <div className="st-card"><DailyChart title={`Profile views · ${s.last30.views.toLocaleString()} in 30 days`} points={s.viewsByDay} unit="views" /></div>
        <div className="st-card"><DailyChart title={`New accounts · ${s.last30.signups.toLocaleString()} in 30 days`} points={s.signupsByDay} unit="sign-ups" /></div>
      </section>

      <section className="st-grid-3">
        <BarList title="Visitors by country" rows={s.countries} unit="views" />
        <BarList title="Devices" rows={s.devices} unit="views" />
        <BarList title="Browsers" rows={s.browsers} unit="views" />
      </section>

      <section className="st-grid-2">
        <section className="st-card">
          <h2>Most viewed</h2>
          <ol className="st-people">
            {s.topProfiles.map((p, i) => (
              <li key={p.slug}>
                <span className="st-rank">{i + 1}</span>
                <a href={`${SITE}/${p.slug}`}><Avatar src={p.avatar} /><span>{p.displayName}</span></a>
                <span className="st-people-value">{p.views.toLocaleString()} <em>views</em></span>
              </li>
            ))}
          </ol>
        </section>
        <section className="st-card">
          <h2>Newest members</h2>
          <ul className="st-newest">
            {s.newest.map((p) => (
              <li key={p.slug}><a href={`${SITE}/${p.slug}`}><Avatar src={p.avatar} /><span>{p.displayName}</span><small>/{p.slug}</small></a></li>
            ))}
          </ul>
        </section>
      </section>

      <footer className="st-footer">
        Visitor charts cover the last 30 days (unique visitors per page). Numbers refresh every minute. ·{" "}
        <a href={SITE}>Create your page →</a>
      </footer>
    </main>
  );
}
