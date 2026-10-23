"use client";

import { useEffect, useState } from "react";

export default function ClockWidget({ timezone, format24h, location }: { timezone: string; format24h: boolean; location: string }) {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: !format24h });
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000 * 15);
    return () => clearInterval(id);
  }, [timezone, format24h]);

  return (
    <div className="game-int-card" style={{ ["--int-color" as string]: "#38bdf8" }} title={`${location} local time`}>
      <div className="game-int-icon" style={{ color: "#38bdf8" }}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
      </div>
      <div className="game-int-info">
        <div className="game-int-name">{now ?? "--:--"}</div>
        <div className="game-int-sub">{location}</div>
      </div>
    </div>
  );
}
