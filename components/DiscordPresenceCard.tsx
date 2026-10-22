"use client";

import { useEffect, useState } from "react";
import type { DiscordProfile } from "@/lib/discord-profile";

interface Props {
  discordUserId: string;
  discordUsername: string;
  discordGlobalName: string | null;
  discordAvatar: string | null;
}

type Activity = {
  name: string;
  type: number;
  details: string | null;
  state: string | null;
  url?: string | null;
  start?: number | null;
  end?: number | null;
  largeImage?: string | null;
  largeText?: string | null;
  smallImage?: string | null;
  smallText?: string | null;
  emoji?: { name: string; url: string | null } | null;
};

type Presence = { status: string; clientStatus: Record<string, string> | null; activities: Activity[]; profile: DiscordProfile | null };

const STATUS_LABEL: Record<string, string> = { online: "Online", idle: "Idle", dnd: "Do Not Disturb", offline: "Offline" };
const VERB: Record<number, string> = { 0: "Playing", 1: "Streaming", 2: "Listening to", 3: "Watching", 5: "Competing in" };

function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

function DiscordLogo({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 127.14 96.36" width={size} height={size} aria-hidden="true">
      <path fill="currentColor" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z" />
    </svg>
  );
}

function ActivityRow({ a, now }: { a: Activity; now: number }) {
  const isSpotify = a.type === 2 && a.name === "Spotify";
  const title = isSpotify ? a.details || a.name : a.name;
  const lines = isSpotify ? [a.state ? `by ${a.state}` : null, a.largeText ? `on ${a.largeText}` : null] : [a.details, a.state];
  const progress = a.start && a.end ? Math.min(1, Math.max(0, (now - a.start) / (a.end - a.start))) : null;

  return (
    <div className="dpc-activity">
      <div className="dpc-activity-head">{isSpotify ? "Listening to Spotify" : `${VERB[a.type] ?? ""}`.trim() || "Activity"}</div>
      <div className="dpc-activity-body">
        {a.largeImage && (
          <div className="dpc-activity-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.largeImage} alt={a.largeText || ""} title={a.largeText || undefined} />
            {a.smallImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="dpc-activity-small" src={a.smallImage} alt={a.smallText || ""} title={a.smallText || undefined} />
            )}
          </div>
        )}
        <div className="dpc-activity-text">
          <b title={title}>{title}</b>
          {lines.filter(Boolean).map((l, i) => <span key={i} title={l!}>{l}</span>)}
          {progress === null && a.start && <span className="dpc-activity-time">{fmtClock(now - a.start)} elapsed</span>}
          {a.type === 1 && a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="dpc-activity-link">Watch stream ↗</a>}
        </div>
      </div>
      {progress !== null && a.start && a.end && (
        <div className="dpc-progress">
          <div className="dpc-progress-bar"><span style={{ width: `${progress * 100}%` }} /></div>
          <div className="dpc-progress-times"><span>{fmtClock(now - a.start)}</span><span>{fmtClock(a.end - a.start)}</span></div>
        </div>
      )}
    </div>
  );
}

export default function DiscordPresenceCard({ discordUserId, discordUsername, discordGlobalName, discordAvatar }: Props) {
  const [data, setData] = useState<Presence | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const fd = new FormData();
        fd.append("discord_id", discordUserId);
        const res = await fetch("/api/integrations/discord-presence", { method: "POST", body: fd });
        const json = await res.json();
        if (!cancelled && json.success) setData(json.data);
      } catch {}
    }
    load();
    const poll = setInterval(load, 30000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { cancelled = true; clearInterval(poll); clearInterval(tick); };
  }, [discordUserId]);

  const p = data?.profile;
  const status = data?.status || "offline";
  const custom = data?.activities.find((a) => a.type === 4);
  const activities = (data?.activities || []).filter((a) => a.type !== 4);
  const name = p?.globalName || discordGlobalName || p?.username || discordUsername;
  const avatar = p?.avatarUrl || (discordAvatar ? `https://cdn.discordapp.com/avatars/${discordUserId}/${discordAvatar}.${discordAvatar.startsWith("a_") ? "gif" : "png"}?size=160` : "https://cdn.discordapp.com/embed/avatars/0.png");
  const onMobile = !!data?.clientStatus && !data.clientStatus.desktop && !data.clientStatus.web && !!data.clientStatus.mobile;

  return (
    <div className="dpc-card">
      <div
        className="dpc-banner"
        style={p?.bannerUrl ? { backgroundImage: `url(${p.bannerUrl})` } : { background: p?.bannerColor || "linear-gradient(135deg,#5865f2,#3c45a5)" }}
      />
      <div className="dpc-head">
        <div className="dpc-avatar-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="dpc-avatar" src={avatar} alt="" />
          {p?.decorationUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="dpc-decoration" src={p.decorationUrl} alt="" />
          )}
          <span className={`dpc-status dpc-status--${status} ${onMobile ? "dpc-status--mobile" : ""}`} title={`${STATUS_LABEL[status] || status}${onMobile ? " (mobile)" : ""}`} />
        </div>
        {p && p.badges.length > 0 && (
          <div className="dpc-badges">
            {p.badges.map((b) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={b.key} src={b.icon} alt={b.label} title={b.label} />
            ))}
          </div>
        )}
      </div>

      <div className="dpc-body">
        <div className="dpc-names" style={p?.nameplateUrl ? { backgroundImage: `linear-gradient(90deg, rgba(17,18,20,.85), rgba(17,18,20,.35)), url(${p.nameplateUrl})` } : undefined}>
          <div className="dpc-name-row">
            <b className="dpc-name">{name}</b>
            {p?.guildTag && (
              <span className="dpc-guild-tag" title="Server tag">
                {p.guildTag.badgeUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.guildTag.badgeUrl} alt="" />
                )}
                {p.guildTag.tag}
              </span>
            )}
          </div>
          <span className="dpc-username">{p?.username || discordUsername}</span>
        </div>

        {custom && (custom.state || custom.emoji) && (
          <div className="dpc-custom">
            {custom.emoji?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={custom.emoji.url} alt={custom.emoji.name} />
            ) : custom.emoji ? <span>{custom.emoji.name}</span> : null}
            {custom.state && <span>{custom.state}</span>}
          </div>
        )}

        {activities.map((a, i) => <ActivityRow key={`${a.name}-${i}`} a={a} now={now} />)}

        <div className="dpc-foot">
          <span className="dpc-since">
            <DiscordLogo size={13} />
            {p ? `Member since ${new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "Discord"}
          </span>
          <a className="dpc-open" href={`https://discord.com/users/${discordUserId}`} target="_blank" rel="noopener noreferrer">View profile</a>
        </div>
      </div>
    </div>
  );
}
