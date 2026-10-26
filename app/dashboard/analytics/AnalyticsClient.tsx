"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useT } from "@/lib/i18n/client";
import type { ChartInstance, ChartTooltipItem, ChartScriptableContext } from "@/lib/chartjs";


type Country = { code: string; name: string; cnt: number };
type NamedCount = { cnt: number; browser?: string; os_name?: string };
type LinkItem = { link_id: number; link_title: string | null; link_url: string | null; cnt: number };
type Data = {
  labels: string[];
  data: number[];
  devices: { desktop: number; mobile: number; tablet: number };
  countries: Country[];
  total_ctr_views: number;
  browsers: NamedCount[];
  os: NamedCount[];
  top_links: LinkItem[];
  total_link_clicks: number;
  stats: { total: number; peak: number; daily_avg: number; today: number; days: number };
};

const RANGE_LABELS: Record<string, string> = { "1d": "Today", "3d": "Last 3 days", "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days" };

function fmt(n: number) {
  return n.toLocaleString();
}
function pct(val: number, total: number) {
  return total > 0 ? `${Math.round((val / total) * 100)}%` : "0%";
}
function hexToRgb(h: string) {
  if (!h.startsWith("#")) return "124,58,237";
  return `${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)}`;
}

function browserAbbr(name: string) {
  const b = name.toLowerCase();
  const icons: Record<string, string> = { chrome: "Ch", firefox: "Ff", safari: "Sa", edge: "Ed", opera: "Op", samsung: "Sa", brave: "Br" };
  const key = Object.keys(icons).find((k) => b.includes(k));
  return key ? icons[key] : b.slice(0, 2).toUpperCase();
}
function osAbbr(name: string) {
  const o = name.toLowerCase();
  if (o.includes("windows")) return "Win";
  if (o.includes("mac") || o.includes("ios")) return "Mac";
  if (o.includes("android")) return "And";
  if (o.includes("linux")) return "Lin";
  return o.slice(0, 3).toUpperCase();
}

function GenericList({ items, nameKey, iconFn }: { items: NamedCount[]; nameKey: "browser" | "os_name"; iconFn: (s: string) => string }) {
  const t = useT();
  const total = items.reduce((s, i) => s + i.cnt, 0);
  if (items.length === 0) {
    return (
      <div className="an-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36" style={{ opacity: 0.25 }}><circle cx="12" cy="12" r="10" /></svg>
        <strong>{t("No data yet")}</strong><span>{t("Data will appear here once visitors arrive.")}</span>
      </div>
    );
  }
  const topCnt = items[0]?.cnt || 1;
  return (
    <>
      {items.map((item, i) => {
        const name = (item[nameKey] as string) || "Unknown";
        const barW = Math.round((item.cnt / topCnt) * 100);
        return (
          <div className="an-list-item" key={i}>
            <div className="an-list-icon">{iconFn(name)}</div>
            <div className="an-list-info">
              <div className="an-list-name">{name}</div>
              <div className="an-list-bar-wrap"><div className="an-list-bar" style={{ width: `${barW}%` }} /></div>
            </div>
            <div className="an-list-stat">{fmt(item.cnt)} <span style={{ color: "rgba(240,240,240,.3)" }}>{pct(item.cnt, total)}</span></div>
          </div>
        );
      })}
    </>
  );
}

export default function AnalyticsClient() {
  const t = useT();
  const [range, setRange] = useState("7d");
  const [d, setD] = useState<Data | null>(null);
  const [updateText, setUpdateText] = useState("Loading…");
  const [chartsReady, setChartsReady] = useState(false);

  const viewsCanvasRef = useRef<HTMLCanvasElement>(null);
  const deviceCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewsChartRef = useRef<ChartInstance | null>(null);
  const deviceChartRef = useRef<ChartInstance | null>(null);

  function initCharts() {
    if (!window.Chart || !viewsCanvasRef.current || !deviceCanvasRef.current || viewsChartRef.current) return;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#c6ff3d";
    const accent2 = getComputedStyle(document.documentElement).getPropertyValue("--accent2").trim() || "#8fc21a";
    const rgb = hexToRgb(accent);

    viewsChartRef.current = new window.Chart(viewsCanvasRef.current.getContext("2d"), {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          data: [],
          borderColor: accent,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: accent,
          pointBorderColor: `rgba(${rgb},.3)`,
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: accent,
          fill: true,
          backgroundColor: (ctx: ChartScriptableContext) => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 220);
            g.addColorStop(0, `rgba(${rgb},.18)`);
            g.addColorStop(1, `rgba(${rgb},0)`);
            return g;
          },
          tension: 0.4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(6,6,18,.97)",
            borderColor: "rgba(255,255,255,.1)",
            borderWidth: 1,
            titleColor: "rgba(255,255,255,.5)",
            bodyColor: accent,
            padding: 12,
            displayColors: false,
            callbacks: { title: (i: ChartTooltipItem[]) => i[0].label, label: (i: ChartTooltipItem) => `${i.parsed.y} views` },
          },
        },
        scales: {
          x: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { color: "rgba(255,255,255,.3)", font: { size: 11 }, maxTicksLimit: 10 } },
          y: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { color: "rgba(255,255,255,.3)", font: { size: 11 }, precision: 0, maxTicksLimit: 5 }, beginAtZero: true },
        },
      },
    });

    deviceChartRef.current = new window.Chart(deviceCanvasRef.current.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Desktop", "Mobile", "Tablet"],
        datasets: [{ data: [0, 0, 0], backgroundColor: [accent, accent2, "#00c864"], borderColor: "rgba(6,6,18,.97)", borderWidth: 3, hoverOffset: 4 }],
      },
      options: {
        responsive: false,
        cutout: "72%",
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: "rgba(6,6,18,.97)", borderColor: "rgba(255,255,255,.1)", borderWidth: 1, bodyColor: "#f0f0f0", padding: 10, displayColors: true },
        },
      },
    });

    setChartsReady(true);
  }

  function showData(json: Data) {
    setD(json);
    if (viewsChartRef.current) {
      viewsChartRef.current.data.labels = json.labels;
      viewsChartRef.current.data.datasets[0].data = json.data;
      viewsChartRef.current.update("active");
    }
    if (deviceChartRef.current) {
      deviceChartRef.current.data.datasets[0].data = [json.devices.desktop, json.devices.mobile, json.devices.tablet];
      deviceChartRef.current.update();
    }
    setUpdateText(`Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  }

  useEffect(() => {
    if (window.Chart) initCharts();
  }, []);

  // Load the selected range once the charts exist, then refresh it every two minutes.
  useEffect(() => {
    if (!chartsReady) return;
    let cancelled = false;
    const load = () =>
      fetch(`/api/analytics_data?range=${range}`)
        .then((res) => res.json() as Promise<Data>)
        .then((json) => { if (!cancelled) showData(json); })
        .catch(() => { if (!cancelled) setUpdateText("Error loading data"); });
    load();
    const iv = setInterval(load, 120000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [chartsReady, range]);

  function pickRange(r: string) {
    setUpdateText("Updating…");
    setRange(r);
  }

  const devTotal = d ? d.devices.desktop + d.devices.mobile + d.devices.tablet : 0;

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js" strategy="afterInteractive" onLoad={initCharts} onReady={initCharts} />

      <div className="an-header">
        <div className="an-header-left">
          <h2>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            {t("Analytics")}
          </h2>
          <p>{t("Track your profile performance and visitor insights in real time.")}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem", flexWrap: "wrap" }}>
          <span className="an-update-pill">
            <span className="an-update-dot" />
            <span>{updateText}</span>
          </span>
          <div className="an-range-tabs">
            {(["1d", "3d", "7d", "30d", "90d"] as const).map((r) => (
              <button key={r} className={`an-range-tab ${range === r ? "active" : ""}`} onClick={() => pickRange(r)}>
                {r === "1d" ? "Today" : r === "3d" ? "3 Days" : r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "90 Days"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="an-stats">
        <div className="an-stat">
          <div className="an-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          </div>
          <div className="an-stat-value">{d ? fmt(d.stats.total) : "—"}</div>
          <div className="an-stat-label">{t("Profile Views")}</div>
          <div className="an-stat-sub"><span className="badge-neut">{RANGE_LABELS[range].toLowerCase()}</span></div>
        </div>
        <div className="an-stat">
          <div className="an-stat-icon icon-pink">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </div>
          <div className="an-stat-value">{d ? d.stats.daily_avg : "—"}</div>
          <div className="an-stat-label">{t("Daily Average")}</div>
          <div className="an-stat-sub"><span className="badge-neut">{t("visitors / day")}</span></div>
        </div>
        <div className="an-stat">
          <div className="an-stat-icon icon-green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
          </div>
          <div className="an-stat-value">{d ? fmt(d.stats.peak) : "—"}</div>
          <div className="an-stat-label">{t("Peak Day")}</div>
          <div className="an-stat-sub"><span className="badge-neut">{t("best single day")}</span></div>
        </div>
        <div className="an-stat">
          <div className="an-stat-icon icon-amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
          </div>
          <div className="an-stat-value">{d ? fmt(d.stats.today) : "—"}</div>
          <div className="an-stat-label">{t("Today's Views")}</div>
          <div className="an-stat-sub"><span className="badge-neut">{t("since midnight")}</span></div>
        </div>
      </div>

      <div className="an-charts-row">
        <div className="an-card">
          <div className="an-card-header">
            <span className="an-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
              {t("Views Over Time")}
            </span>
            <span className="an-card-badge">{RANGE_LABELS[range]}</span>
          </div>
          <div className="an-chart-wrap">
            {!d && (
              <div className="an-chart-loading">
                <div className="an-spinner" />{" "}{t("Loading chart…")}
              </div>
            )}
            <canvas ref={viewsCanvasRef} style={{ display: d ? "block" : "none" }} />
          </div>
        </div>

        <div className="an-card">
          <div className="an-card-header">
            <span className="an-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
              {t("Visitor Devices")}
            </span>
          </div>
          <div className="an-donut-wrap">
            <div className="an-donut-canvas-wrap">
              <canvas ref={deviceCanvasRef} width={160} height={160} />
              <div className="an-donut-center">
                <span className="an-donut-center-val">{d ? fmt(devTotal) : "—"}</span>
                <span className="an-donut-center-lbl">{t("Visitors")}</span>
              </div>
            </div>
            <div className="an-legend">
              <div className="an-legend-item">
                <span className="an-legend-dot" style={{ background: "var(--accent)" }} />
                <span className="an-legend-label">{t("Desktop")}</span>
                <span className="an-legend-val">{d ? fmt(d.devices.desktop) : "—"}</span>
                <span className="an-legend-pct">{d ? pct(d.devices.desktop, devTotal) : ""}</span>
              </div>
              <div className="an-legend-item">
                <span className="an-legend-dot" style={{ background: "var(--accent2)" }} />
                <span className="an-legend-label">{t("Mobile")}</span>
                <span className="an-legend-val">{d ? fmt(d.devices.mobile) : "—"}</span>
                <span className="an-legend-pct">{d ? pct(d.devices.mobile, devTotal) : ""}</span>
              </div>
              <div className="an-legend-item">
                <span className="an-legend-dot" style={{ background: "#00c864" }} />
                <span className="an-legend-label">{t("Tablet")}</span>
                <span className="an-legend-val">{d ? fmt(d.devices.tablet) : "—"}</span>
                <span className="an-legend-pct">{d ? pct(d.devices.tablet, devTotal) : ""}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="an-card">
        <div className="an-card-header">
          <span className="an-card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
            {t("Top Countries by Views")}
          </span>
          <span className="an-card-badge">{d ? `${fmt(d.total_ctr_views)} total` : "—"}</span>
        </div>
        {!d ? (
          <div className="an-empty"><div className="an-spinner" /></div>
        ) : d.countries.length === 0 ? (
          <div className="an-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
            <strong>{t("No country data yet")}</strong>
            <span>{t("Visit your profile to start collecting country data.")}</span>
          </div>
        ) : (
          d.countries.map((c, i) => {
            const topCount = d.countries[0]?.cnt || 1;
            const barW = Math.round((c.cnt / topCount) * 100);
            return (
              <div className="an-country-item" key={i}>
                <FlagImg code={c.code} />
                <div className="an-country-info">
                  <div className="an-country-name">{c.name || "Unknown"}</div>
                  <div className="an-country-bar-wrap"><div className="an-country-bar" style={{ width: `${barW}%` }} /></div>
                </div>
                <div className="an-country-views">{fmt(c.cnt)} <span style={{ color: "rgba(240,240,240,.3)" }}>{pct(c.cnt, d.total_ctr_views)}</span></div>
              </div>
            );
          })
        )}
      </div>

      <div className="an-bottom-row">
        <div className="an-card">
          <div className="an-card-header">
            <span className="an-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
              {t("Top Browsers")}
            </span>
            <span className="an-card-badge">{d ? `${fmt(d.browsers.reduce((s, b) => s + b.cnt, 0))} views` : "—"}</span>
          </div>
          {d ? <GenericList items={d.browsers} nameKey="browser" iconFn={browserAbbr} /> : <div className="an-empty"><div className="an-spinner" /></div>}
        </div>

        <div className="an-card">
          <div className="an-card-header">
            <span className="an-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
              {t("Top OS")}
            </span>
            <span className="an-card-badge">{d ? `${fmt(d.os.reduce((s, o) => s + o.cnt, 0))} views` : "—"}</span>
          </div>
          {d ? <GenericList items={d.os} nameKey="os_name" iconFn={osAbbr} /> : <div className="an-empty"><div className="an-spinner" /></div>}
        </div>

        <div className="an-card">
          <div className="an-card-header">
            <span className="an-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
              {t("Top Links")}
            </span>
            <span className="an-card-badge">{d ? `${fmt(d.total_link_clicks)} clicks` : "—"}</span>
          </div>
          {!d ? (
            <div className="an-empty"><div className="an-spinner" /></div>
          ) : d.top_links.length === 0 ? (
            <div className="an-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36" style={{ opacity: 0.25 }}><circle cx="12" cy="12" r="10" /></svg>
              <strong>{t("No link clicks yet")}</strong><span>{t("Clicks on your links will appear here.")}</span>
            </div>
          ) : (
            d.top_links.map((l) => {
              const topLC = d.top_links[0]?.cnt || 1;
              const barW = Math.round((l.cnt / topLC) * 100);
              let label = l.link_title || "Link";
              if (!l.link_title && l.link_url) {
                try {
                  label = new URL(l.link_url).hostname;
                } catch {
                  label = l.link_url;
                }
              }
              return (
                <div className="an-list-item" key={l.link_id}>
                  <div className="an-list-icon" style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                  </div>
                  <div className="an-list-info">
                    <div className="an-list-name">{label}</div>
                    <div className="an-list-bar-wrap"><div className="an-list-bar" style={{ width: `${barW}%` }} /></div>
                  </div>
                  <div className="an-list-stat">{fmt(l.cnt)} <span style={{ color: "rgba(240,240,240,.3)" }}>{pct(l.cnt, d.total_link_clicks)}</span></div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

function FlagImg({ code }: { code: string }) {
  const [failed, setFailed] = useState(false);
  const c = (code || "XX").toLowerCase();
  if (failed) {
    return <div className="an-country-flag-fallback">{(code || "XX").toUpperCase()}</div>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="an-country-flag" src={`https://flagcdn.com/24x18/${c}.png`} alt={code} onError={() => setFailed(true)} />;
}
