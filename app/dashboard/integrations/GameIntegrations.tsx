"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/lib/toast";
import { SteamIcon, RobloxIcon, MinecraftIcon, ServerIcon, ValorantIcon, TwitchIcon } from "@/components/IntegrationIcons";

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
}: {
  type: string;
  title: string;
  subtitle: string;
  color: string;
  icon: React.ReactNode;
  fields?: { name: string; placeholder: string }[];
  connectHref?: string;
  renderPreview: (data: Record<string, unknown>) => React.ReactNode;
}) {
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
      showToast("Network error", "error");
    }
  }

  async function toggleVisible() {
    try {
      const res = await fetch(`/api/integrations/${type}`, { method: "PATCH" });
      const j = await res.json();
      if (j.success) setIntegration((i) => (i ? { ...i, visible: j.visible } : i));
    } catch {
      showToast("Network error", "error");
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
          <div className="int-status connected"><div className="int-status-dot" />Connected</div>
          {renderPreview(integration.data)}
          <div className="int-card-footer-row">
            <button className="int-btn int-btn-outline" onClick={toggleVisible}>{integration.visible ? "Hide" : "Show"}</button>
            <button className="int-btn int-btn-danger" onClick={disconnect}>Disconnect</button>
          </div>
        </>
      ) : (
        <>
          <div className="int-status disconnected"><div className="int-status-dot" />Not connected</div>
          {connectHref ? (
            <>
              <p className="int-card-desc">{subtitle}</p>
              <div className="int-card-footer">
                <a href={connectHref} className="int-btn int-btn-primary">{icon} Connect {title}</a>
              </div>
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
                <button className="int-btn int-btn-primary" onClick={() => setFormOpen(true)}>{icon} Connect {title}</button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function GameIntegrations() {
  return (
    <>
      <div className="section-header">
        <h2>Game Integrations</h2>
        <p>Show your gaming accounts and a live server status on your profile</p>
      </div>

      <div className="int-grid">
        <GameCard
          type="steam"
          title="Steam"
          subtitle="Show your Steam profile on your page"
          color="#66c0f4"
          icon={<SteamIcon />}
          connectHref="/api/integrations/steam/connect"
          renderPreview={(d) => (
            <div className="int-preview-generic">
              <div className="int-preview-avatar">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {d.avatarUrl ? <img src={String(d.avatarUrl)} alt="" /> : <SteamIcon size={16} />}
              </div>
              <div className="int-preview-info">
                <div className="int-preview-name">{String(d.personaName || "")}</div>
                <div className="int-preview-sub">Steam</div>
              </div>
            </div>
          )}
        />

        <GameCard
          type="roblox"
          title="Roblox"
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
          title="Minecraft"
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
                <div className="int-preview-sub">Minecraft</div>
              </div>
            </div>
          )}
        />

        <GameCard
          type="mcserver"
          title="MC Server"
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
          title="Twitch"
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
          type="valorant"
          title="Valorant"
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
