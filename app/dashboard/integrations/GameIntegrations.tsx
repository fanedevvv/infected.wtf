"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/lib/toast";

type IntegrationRow = { data: Record<string, unknown>; visible: boolean } | null;

const SteamIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z" /></svg>
);
const RobloxIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}><path d="M4.24 0 0 19.76 19.76 24 24 4.24 4.24 0zm9.55 8.09 2.12 9.62-9.62 2.12L4.17 10.2l9.62-2.11z" /></svg>
);
const MinecraftIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}><path d="M2 2h20v20H2V2zm4 4v4h4V6H6zm8 0v4h4V6h-4zM6 14v4h4v-4H6zm8 0v4h4v-4h-4z" /></svg>
);
const ServerIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={size} height={size}><rect x="2" y="3" width="20" height="7" rx="1" /><rect x="2" y="14" width="20" height="7" rx="1" /><line x1="6" y1="6.5" x2="6" y2="6.5" /><line x1="6" y1="17.5" x2="6" y2="17.5" /></svg>
);
const ValorantIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}><path d="M23.75 4.24 14.6 15.94a.36.36 0 0 0-.06.32l1.96 6.87a.35.35 0 0 0 .65.06l6.68-18.75a.35.35 0 0 0-.08-.2zM.32 4.5 9.65 15.5a.36.36 0 0 1 .06.32l-2.04 6.9a.35.35 0 0 1-.65.05L.02 4.7a.35.35 0 0 1 .3-.2z" /></svg>
);

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
