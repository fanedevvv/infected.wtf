"use client";

import { useEffect, useState } from "react";

type Analytics = {
  totalViews: number;
  localViews: number;
  linkClicks: number;
  days: { date: string; count: number }[];
  devices: { type: string; count: number }[];
  topCountries: { country: string; count: number }[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <main className="flex-1 px-4 py-10 max-w-3xl mx-auto w-full text-white/50">Loading…</main>;

  const max = Math.max(1, ...data.days.map((d) => d.count));

  return (
    <main className="flex-1 px-4 py-10 max-w-3xl mx-auto w-full">
      <h1 className="font-[var(--font-display)] text-2xl font-bold mb-6">Analytics</h1>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="gf-card p-4 text-center">
          <div className="text-2xl font-bold">{data.totalViews.toLocaleString()}</div>
          <div className="text-white/40 text-xs">Total views</div>
        </div>
        <div className="gf-card p-4 text-center">
          <div className="text-2xl font-bold">{data.localViews.toLocaleString()}</div>
          <div className="text-white/40 text-xs">Local views</div>
        </div>
        <div className="gf-card p-4 text-center">
          <div className="text-2xl font-bold">{data.linkClicks.toLocaleString()}</div>
          <div className="text-white/40 text-xs">Link clicks</div>
        </div>
      </div>

      <div className="gf-card p-6 mb-6">
        <h2 className="font-semibold mb-4 text-sm">Views — last 30 days</h2>
        <div className="flex items-end gap-1 h-32">
          {data.days.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.count}`}
              className="flex-1 rounded-t bg-[var(--accent)]/60 hover:bg-[var(--accent)] transition-colors"
              style={{ height: `${Math.max(2, (d.count / max) * 100)}%` }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="gf-card p-6">
          <h2 className="font-semibold mb-3 text-sm">Devices</h2>
          {data.devices.map((d) => (
            <div key={d.type} className="flex justify-between text-sm py-1 text-white/70">
              <span className="capitalize">{d.type}</span>
              <span>{d.count}</span>
            </div>
          ))}
        </div>
        <div className="gf-card p-6">
          <h2 className="font-semibold mb-3 text-sm">Top countries</h2>
          {data.topCountries.map((c) => (
            <div key={c.country} className="flex justify-between text-sm py-1 text-white/70">
              <span>{c.country}</span>
              <span>{c.count}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
