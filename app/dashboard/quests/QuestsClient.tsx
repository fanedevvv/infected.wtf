"use client";

import { useCallback, useEffect, useState } from "react";
import { showToast } from "@/lib/toast";

type Quest = { id: string; period: "daily" | "weekly" | "once"; title: string; desc: string; goal: number; progress: number; claimed: boolean; rewardLabel: string };

const SECTIONS: { period: Quest["period"]; title: string; note: () => string }[] = [
  { period: "daily", title: "Daily", note: () => `Resets in ${until(nextUtcMidnight())}` },
  { period: "weekly", title: "Weekly", note: () => `Resets in ${until(nextUtcMonday())}` },
  { period: "once", title: "One-time", note: () => "Exclusive rewards for the long run" },
];

function nextUtcMidnight() { const d = new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1); }
function nextUtcMonday() { const d = new Date(); const day = d.getUTCDay() || 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + (8 - day)); }
function until(ts: number) {
  const ms = Math.max(0, ts - Date.now());
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
}

export default function QuestsClient() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [completed, setCompleted] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const j = await fetch("/api/quests").then((r) => r.json()).catch(() => null);
    if (j?.success) { setQuests(j.quests); setCompleted(j.completed); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function claim(q: Quest) {
    setBusy(q.id);
    try {
      const j = await fetch("/api/quests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questId: q.id }) }).then((r) => r.json());
      if (j.success) { showToast(j.message, "success"); window.dispatchEvent(new Event("dash:refresh-me")); await load(); }
      else showToast(j.error || "Error", "error");
    } catch { showToast("Network error", "error"); } finally { setBusy(null); }
  }

  return (
    <div className="quest-page">
      <div className="dash-card coll-head">
        <div>
          <h2>Quests</h2>
          <p>Finish goals to earn tokens — and collectibles you can&apos;t buy anywhere else.</p>
        </div>
        <div className="coll-balance"><span>Completed</span><b>{completed}</b><small>quests</small></div>
      </div>

      {SECTIONS.map((sec) => (
        <section key={sec.period} className="quest-section">
          <div className="quest-section-head"><h3>{sec.title}</h3><span>{sec.note()}</span></div>
          <div className="quest-list">
            {quests.filter((q) => q.period === sec.period).map((q) => {
              const done = q.progress >= q.goal;
              return (
                <div key={q.id} className={`quest${done ? " is-done" : ""}${q.claimed ? " is-claimed" : ""}`}>
                  <div className="quest-main">
                    <b>{q.title}</b>
                    <p>{q.desc}</p>
                    <div className="quest-bar"><i style={{ width: `${(q.progress / q.goal) * 100}%` }} /></div>
                    <small>{q.progress}/{q.goal}</small>
                  </div>
                  <div className="quest-side">
                    <span className="quest-reward">{q.rewardLabel}</span>
                    {q.claimed ? (
                      <span className="quest-claimed">✓ Claimed</span>
                    ) : (
                      <button type="button" className="btn btn-primary btn-sm" disabled={!done || busy === q.id} onClick={() => claim(q)}>{done ? "Claim" : "In progress"}</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
