"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/lib/toast";
import { SteamIcon, RobloxIcon, MinecraftIcon, ServerIcon, ValorantIcon, TwitchIcon, SpotifyIcon, GithubIcon, PinterestIcon, YoutubeIcon } from "@/components/IntegrationIcons";
import { useT } from "@/lib/i18n/client";

type IntegrationRow = { data: Record<string, unknown>; visible: boolean } | null;

function GameCard({
  type,
  title,
  subtitle,
  color,
  icon,
  fields,
  connectHref,
  renderPreview,
  extraConnect,
}: {
  type: string;
  title: string;
  subtitle: string;
  color: string;
  icon: React.ReactNode;
  fields?: { name: string; placeholder: string }[];
  connectHref?: string;
  renderPreview: (data: Record<string, unknown>) => React.ReactNode;
  /** Alternative way to connect, shown under the main button; calls back with the saved integration data. */
  extraConnect?: (onConnected: (data: Record<string, unknown>) => void) => React.ReactNode;
}) {
  const t = useT();
  const [integration, setIntegration] = useState<IntegrationRow>(null);
  const [loaded, setLoaded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/integrations/${type}`)
      .then((r) => r.json())
      .then((d) => { setIntegration(d.integration || null); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [type]);

  async function connect() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/integrations/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const j = await res.json();
      if (j.success) {
        setIntegration({ data: j.data, visible: true });
        setFormOpen(false);
        showToast(`${title} connected!`, "success");
      } else {
        setError(j.error || "Something went wrong.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    try {
      await fetch(`/api/integrations/${type}`, { method: "DELETE" });
      setIntegration(null);
      showToast(`${title} disconnected.`, "success");
    } catch {
      showToast(t("Network error"), "error");
    }
  }

  async function toggleVisible() {
    try {
      const res = await fetch(`/api/integrations/${type}`, { method: "PATCH" });
      const j = await res.json();
      if (j.success) setIntegration((i) => (i ? { ...i, visible: j.visible } : i));
    } catch {
      showToast(t("Network error"), "error");
    }
  }

  if (!loaded) return null;

  return (
    <div className="int-card" style={{ ["--int-color" as string]: color }}>
      <div className="int-card-header">
        <div className="int-card-icon generic-icon">{icon}</div>
        <div>
          <div className="int-card-title">{title}</div>
          <div className="int-card-subtitle">{subtitle}</div>
        </div>
      </div>

      {integration ? (
        <>
          <div className="int-status connected"><div className="int-status-dot" />{t("Connected")}</div>
          {renderPreview(integration.data)}
          <div className="int-card-footer-row">
            <button className="int-btn int-btn-outline" onClick={toggleVisible}>{integration.visible ? "Hide" : "Show"}</button>
            <button className="int-btn int-btn-danger" onClick={disconnect}>{t("Disconnect")}</button>
          </div>
        </>
      ) : (
        <>
          <div className="int-status disconnected"><div className="int-status-dot" />{t("Not connected")}</div>
          {connectHref ? (
            <>
              <p className="int-card-desc">{subtitle}</p>
              <div className="int-card-footer">
                <a href={connectHref} className="int-btn int-btn-primary">{icon}{" "}{t("Connect")}{" "}{title}</a>
              </div>
              {extraConnect?.((data) => { setIntegration({ data, visible: true }); showToast(`${title} connected!`, "success"); })}
            </>
          ) : formOpen ? (
            <div className="int-connect-form">
              {fields!.map((f) => (
                <input
                  key={f.name}
                  className="form-control"
                  placeholder={f.placeholder}
                  value={values[f.name] || ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                />
              ))}
              {error && <div className="int-error">{error}</div>}
              <button className="int-btn int-btn-primary" onClick={connect} disabled={busy}>{busy ? "Connecting…" : "Connect"}</button>
            </div>
          ) : (
            <>
              <p className="int-card-desc">{subtitle}</p>
              <div className="int-card-footer">
                <button className="int-btn int-btn-primary" onClick={() => setFormOpen(true)}>{icon}{" "}{t("Connect")}{" "}{title}</button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/** Connect Steam without logging in: prove the profile is yours with a code in its summary. */
function SteamCodeConnect({ onConnected }: { onConnected: (data: Record<string, unknown>) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState("");
  const [pending, setPending] = useState<{ steamId64: string; personaName: string; avatarUrl: string; isPublic: boolean; code: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/integrations/steam/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return await res.json();
    } catch {
      return { success: false, error: "Network error." };
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    const d = await call({ action: "start", profile });
    if (d.success) setPending(d);
    else setError(t(d.error || "Something went wrong."));
  }

  async function verify() {
    if (!pending) return;
    const d = await call({ action: "verify", steamId64: pending.steamId64 });
    if (d.success) onConnected(d.data);
    else setError(d.error || "Something went wrong.");
  }

  if (!open) {
    return <button type="button" className="steam-alt-toggle" onClick={() => setOpen(true)}>{t("Connect without logging in")}</button>;
  }

  return (
    <div className="steam-alt">
      {!pending ? (
        <>
          <p>{t("Paste your Steam profile link — you'll prove it's yours from the Steam app, no password needed.")}</p>
          <input className="form-control" placeholder="steamcommunity.com/id/yourname" value={profile} onChange={(e) => setProfile(e.target.value)} />
          {error && <div className="int-error">{error}</div>}
          <button type="button" className="int-btn int-btn-primary" onClick={start} disabled={busy || !profile.trim()}>{busy ? "…" : t("Continue")}</button>
        </>
      ) : (
        <>
          <div className="steam-alt-who">
            {pending.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pending.avatarUrl} alt="" />
            )}
            <b>{pending.personaName}</b>
          </div>
          <ol>
            <li>{t("In the Steam app open your profile → Edit Profile.")}</li>
            <li>{t("Paste this code anywhere in your Summary and save:")}
              <button type="button" className="steam-alt-code" onClick={() => navigator.clipboard?.writeText(pending.code).then(() => showToast(t("Copied!"), "success")).catch(() => {})}>
                {pending.code} <span>{t("Copy")}</span>
              </button>
            </li>
            {!pending.isPublic && <li>{t("Set your profile privacy to Public (you can change it back later).")}</li>}
            <li>{t("Come back here and press Verify. You can remove the code afterwards.")}</li>
          </ol>
          {error && <div className="int-error">{error}</div>}
          <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
            <button type="button" className="int-btn int-btn-primary" onClick={verify} disabled={busy}>{busy ? t("Checking…") : t("Verify")}</button>
            <a className="int-btn int-btn-outline" href={`https://steamcommunity.com/profiles/${pending.steamId64}/edit/info`} target="_blank" rel="noopener noreferrer">{t("Open Steam profile")}</a>
            <button type="button" className="int-btn int-btn-outline" onClick={() => { setPending(null); setError(""); }}>{t("Back")}</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function GameIntegrations() {
  const t = useT();
  return (
    <>
      <div className="section-header">
        <h2>{t("Game Integrations")}</h2>
        <p>{t("Show your gaming accounts and a live server status on your profile")}</p>
      </div>

      <div className="int-grid">
        <GameCard
          type="steam"
          title={t("Steam")}
          subtitle="Show your Steam profile on your page"
          color="#66c0f4"
          icon={<SteamIcon />}
          connectHref="/api/integrations/steam/connect"
          extraConnect={(onConnected) => <SteamCodeConnect onConnected={onConnected} />}
          renderPreview={(d) => (
            <div className="int-preview-generic">
              <div className="int-preview-avatar">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {d.avatarUrl ? <img src={String(d.avatarUrl)} alt="" /> : <SteamIcon size={16} />}
              </div>
              <div className="int-preview-info">
                <div className="int-preview-name">{String(d.personaName || "")}</div>
                <div className="int-preview-sub">{t("Steam")}</div>
              </div>
            </div>
          )}
        />

        <GameCard
          type="roblox"
          title={t("Roblox")}
          subtitle="Show your Roblox username and avatar"
          color="#e2231a"
          icon={<RobloxIcon />}
          fields={[{ name: "username", placeholder: "Roblox username" }]}
          renderPreview={(d) => (
            <div className="int-preview-generic">
              <div className="int-preview-avatar">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {d.avatarUrl ? <img src={String(d.avatarUrl)} alt="" /> : <RobloxIcon size={16} />}
              </div>
              <div className="int-preview-info">
                <div className="int-preview-name">{String(d.displayName || d.username || "")}</div>
                <div className="int-preview-sub">@{String(d.username || "")}</div>
              </div>
            </div>
          )}
        />

        <GameCard
          type="minecraft"
          title={t("Minecraft")}
          subtitle="Show your Minecraft username and skin"
          color="#5cb85c"
          icon={<MinecraftIcon />}
          fields={[{ name: "username", placeholder: "Minecraft username" }]}
          renderPreview={(d) => (
            <div className="int-preview-generic">
              <div className="int-preview-avatar">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {d.avatarUrl ? <img src={String(d.avatarUrl)} alt="" /> : <MinecraftIcon size={16} />}
              </div>
              <div className="int-preview-info">
                <div className="int-preview-name">{String(d.username || "")}</div>
                <div className="int-preview-sub">{t("Minecraft")}</div>
              </div>
            </div>
          )}
        />

        <GameCard
          type="mcserver"
          title={t("MC Server")}
          subtitle="Show a live status widget for a Minecraft server"
          color="#7cb342"
          icon={<ServerIcon />}
          fields={[{ name: "host", placeholder: "play.hypixel.net" }]}
          renderPreview={(d) => (
            <div className="int-preview-generic">
              <div className="int-preview-avatar">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {d.icon ? <img src={String(d.icon)} alt="" /> : <ServerIcon size={16} />}
              </div>
              <div className="int-preview-info">
                <div className="int-preview-name">{String(d.host || "")}</div>
                <div className="int-preview-sub">{d.online ? `● ${String(d.playersOnline ?? 0)}/${String(d.playersMax ?? 0)} online` : "○ offline (last check)"}</div>
              </div>
            </div>
          )}
        />

        <GameCard
          type="twitch"
          title={t("Twitch")}
          subtitle="Show your Twitch channel on your profile"
          color="#9146ff"
          icon={<TwitchIcon />}
          fields={[{ name: "username", placeholder: "Twitch username" }]}
          renderPreview={(d) => (
            <div className="int-preview-generic">
              <div className="int-preview-avatar"><TwitchIcon size={16} /></div>
              <div className="int-preview-info">
                <div className="int-preview-name">{String(d.username || "")}</div>
                <div className="int-preview-sub">twitch.tv/{String(d.username || "")}</div>
              </div>
            </div>
          )}
        />

        <GameCard
          type="spotify"
          title={t("Spotify")}
          subtitle="Show your now playing and recently played tracks"
          color="#1db954"
          icon={<SpotifyIcon />}
          connectHref="/api/integrations/spotify/connect"
          renderPreview={(d) => {
            const now = (d.nowPlaying as Record<string, unknown> | null) || null;
            const recent = (Array.isArray(d.recentTracks) ? d.recentTracks : []) as Array<Record<string, unknown>>;
            return (
              <div className="int-preview-generic" style={{ alignItems: "flex-start" }}>
                <div className="int-preview-avatar">
                  {typeof now?.albumImage === "string" && now.albumImage ? (
                    <img src={now.albumImage} alt="" />
                  ) : (
                    <SpotifyIcon size={16} />
                  )}
                </div>
                <div className="int-preview-info" style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
                  {now && typeof now.trackName === "string" && now.trackName ? (
                    <>
                      <div className="int-preview-sub" style={{ color: "#1db954", fontWeight: 700 }}>{now.isPlaying ? "Now Playing" : "Last Played"}</div>
                      <div className="int-preview-name">{String(now.trackName)}</div>
                      <div className="int-preview-sub">{String(now.artists || "")}</div>
                    </>
                  ) : recent[0] ? (
                    <>
                      <div className="int-preview-sub" style={{ color: "#1db954", fontWeight: 700 }}>{t("Recently Played")}</div>
                      <div className="int-preview-name">{String(recent[0].trackName || "")}</div>
                      <div className="int-preview-sub">{String(recent[0].artists || "")}</div>
                    </>
                  ) : (
                    <>
                      <div className="int-preview-name">{String(d.displayName || "Spotify")}</div>
                      <div className="int-preview-sub">{t("Connected")}</div>
                    </>
                  )}
                </div>
              </div>
            );
          }}
        />

        <GameCard
          type="github"
          title={t("GitHub")}
          subtitle="Show your GitHub profile and repo count"
          color="#f0f6fc"
          icon={<GithubIcon />}
          fields={[{ name: "username", placeholder: "GitHub username" }]}
          renderPreview={(d) => (
            <div className="int-preview-generic">
              <div className="int-preview-avatar">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {d.avatarUrl ? <img src={String(d.avatarUrl)} alt="" /> : <GithubIcon size={16} />}
              </div>
              <div className="int-preview-info">
                <div className="int-preview-name">{String(d.name || d.username || "")}</div>
                <div className="int-preview-sub">{String(d.publicRepos ?? 0)}{" "}{t("repos ·")}{" "}{String(d.followers ?? 0)} followers</div>
              </div>
            </div>
          )}
        />

        <GameCard
          type="pinterest"
          title={t("Pinterest")}
          subtitle="Show a pin, board or profile on your page"
          color="#e60023"
          icon={<PinterestIcon />}
          fields={[{ name: "url", placeholder: "Pinterest profile or board link" }]}
          renderPreview={(d) => (
            <div className="int-preview-generic">
              <div className="int-preview-avatar">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {d.thumbnailUrl ? <img src={String(d.thumbnailUrl)} alt="" /> : <PinterestIcon size={16} />}
              </div>
              <div className="int-preview-info">
                <div className="int-preview-name">{String(d.title || "")}</div>
                <div className="int-preview-sub">{t("Pinterest")}{d.authorName ? ` · ${String(d.authorName)}` : ""}</div>
              </div>
            </div>
          )}
        />

        <GameCard
          type="youtube"
          title={t("YouTube")}
          subtitle="Show your YouTube channel on your profile"
          color="#ff0000"
          icon={<YoutubeIcon />}
          fields={[{ name: "url", placeholder: "youtube.com/@yourchannel" }]}
          renderPreview={(d) => (
            <div className="int-preview-generic">
              <div className="int-preview-avatar">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {d.avatarUrl ? <img src={String(d.avatarUrl)} alt="" /> : <YoutubeIcon size={16} />}
              </div>
              <div className="int-preview-info">
                <div className="int-preview-name">{String(d.name || "")}</div>
                <div className="int-preview-sub">{t("YouTube")}</div>
              </div>
            </div>
          )}
        />

        <GameCard
          type="valorant"
          title={t("Valorant")}
          subtitle="Show your Riot ID on your profile (self-reported)"
          color="#ff4655"
          icon={<ValorantIcon />}
          fields={[
            { name: "riotId", placeholder: "Riot name" },
            { name: "tagLine", placeholder: "Tag (without #)" },
            { name: "region", placeholder: "Region (NA/EU/AP/KR/BR/LATAM)" },
          ]}
          renderPreview={(d) => (
            <div className="int-preview-generic">
              <div className="int-preview-avatar"><ValorantIcon size={16} /></div>
              <div className="int-preview-info">
                <div className="int-preview-name">{String(d.riotId || "")}#{String(d.tagLine || "")}</div>
                <div className="int-preview-sub">{String(d.region || "")}</div>
              </div>
            </div>
          )}
        />
      </div>
    </>
  );
}
