"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { showToast } from "@/lib/toast";
import { SteamIcon, RobloxIcon, MinecraftIcon, ServerIcon, ValorantIcon, TwitchIcon, SpotifyIcon } from "@/components/IntegrationIcons";
import { PLATFORM_COLOR, PLATFORM_ICON, PLATFORM_PLACEHOLDER } from "@/lib/social-platforms";

const SOCIAL_TYPES = ["instagram", "twitter", "youtube", "tiktok", "website"] as const;
type SocialType = (typeof SOCIAL_TYPES)[number];
const SOCIAL_LABEL: Record<SocialType, string> = { instagram: "Instagram", twitter: "Twitter / X", youtube: "YouTube", tiktok: "TikTok", website: "Website" };
type SocialLink = { id: number; platform: string; url: string };

const GAME_TYPES = ["steam", "roblox", "minecraft", "mcserver", "valorant", "twitch", "spotify"] as const;
type GameType = (typeof GAME_TYPES)[number];

const GAME_META: Record<GameType, { label: string; color: string; icon: ReactNode; name: (d: Record<string, unknown>) => string }> = {
  steam: { label: "Steam", color: "#66c0f4", icon: <SteamIcon size={20} />, name: (d) => String(d.personaName || "Steam") },
  roblox: { label: "Roblox", color: "#e2231a", icon: <RobloxIcon size={20} />, name: (d) => String(d.displayName || d.username || "Roblox") },
  minecraft: { label: "Minecraft", color: "#5cb85c", icon: <MinecraftIcon size={20} />, name: (d) => String(d.username || "Minecraft") },
  mcserver: { label: "MC Server", color: "#7cb342", icon: <ServerIcon size={20} />, name: (d) => String(d.host || "MC Server") },
  valorant: { label: "Valorant", color: "#ff4655", icon: <ValorantIcon size={20} />, name: (d) => `${String(d.riotId || "")}#${String(d.tagLine || "")}` },
  twitch: { label: "Twitch", color: "#9146ff", icon: <TwitchIcon size={20} />, name: (d) => String(d.username || "Twitch") },
  spotify: { label: "Spotify", color: "#1db954", icon: <SpotifyIcon size={20} />, name: (d) => String(d.displayName || "Spotify") },
};

type GameRow = { type: GameType; data: Record<string, unknown>; visible: boolean };

type Integration = {
  id: number;
  discordUserId: string | null;
  discordUsername: string | null;
  discordGlobalName: string | null;
  discordAvatar: string | null;
  visible: boolean;
  discordServerInvite: string | null;
  discordServerId: string | null;
  discordServerName: string | null;
  discordServerIcon: string | null;
  discordServerOnline: number | null;
  discordServerTotal: number | null;
  discordServerVisible: boolean;
} | null;

const DiscordIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" width={size} height={size}>
    <path fill="white" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z" />
  </svg>
);

const EyeIcon = ({ off }: { off?: boolean }) =>
  off ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
  );

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
);

const GearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
);

export default function IntegrationsContent({
  initialIntegration,
  initialSocialLinks,
  error,
  connected,
}: {
  initialIntegration: Integration;
  initialSocialLinks: SocialLink[];
  error?: string;
  connected?: string;
}) {
  const [integration, setIntegration] = useState<Integration>(initialIntegration);
  const [manageOpen, setManageOpen] = useState(false);
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [manageServerOpen, setManageServerOpen] = useState(false);
  const [serverInvite, setServerInvite] = useState("");
  const [serverError, setServerError] = useState("");
  const [serverSaving, setServerSaving] = useState(false);
  const [gameRows, setGameRows] = useState<GameRow[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(initialSocialLinks);
  const [socialModal, setSocialModal] = useState<SocialType | null>(null);
  const [socialUrlInput, setSocialUrlInput] = useState("");
  const [socialError, setSocialError] = useState("");
  const [socialSaving, setSocialSaving] = useState(false);

  function openSocialModal(platform: SocialType) {
    const existing = socialLinks.find((l) => l.platform === platform);
    setSocialModal(platform);
    setSocialUrlInput(existing?.url || "");
    setSocialError("");
  }

  async function saveSocialLink() {
    if (!socialModal) return;
    let url = socialUrlInput.trim();
    if (!url) { setSocialError("Please enter a URL or username."); return; }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      if (url.startsWith("@")) url = url.slice(1);
      url = "https://" + url;
    }
    setSocialSaving(true);
    setSocialError("");
    try {
      const existing = socialLinks.find((l) => l.platform === socialModal);
      if (existing) {
        const res = await fetch(`/api/links/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const j = await res.json();
        if (j.success) {
          setSocialLinks((links) => links.map((l) => (l.id === existing.id ? { ...l, url } : l)));
          setSocialModal(null);
          showToast("Link updated!", "success");
        } else setSocialError(j.error || "Failed to update link.");
      } else {
        const res = await fetch("/api/links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: socialModal, url }),
        });
        const j = await res.json();
        if (j.success) {
          setSocialLinks((links) => [...links, { id: j.link.id, platform: j.link.platform, url: j.link.url }]);
          setSocialModal(null);
          showToast("Link added!", "success");
        } else setSocialError(j.error || "Failed to add link.");
      }
    } catch {
      setSocialError("Network error. Please try again.");
    } finally {
      setSocialSaving(false);
    }
  }

  async function deleteSocialLink(platform: SocialType) {
    const existing = socialLinks.find((l) => l.platform === platform);
    if (!existing) return;
    try {
      const res = await fetch(`/api/links/${existing.id}`, { method: "DELETE" });
      const j = await res.json();
      if (j.success) {
        setSocialLinks((links) => links.filter((l) => l.id !== existing.id));
        showToast("Link removed.", "success");
      } else showToast(j.error || "Error", "error");
    } catch {
      showToast("Network error", "error");
    }
  }

  useEffect(() => {
    for (const type of GAME_TYPES) {
      fetch(`/api/integrations/${type}`)
        .then((r) => r.json())
        .then((d) => {
          if (!d.integration) return;
          const row: GameRow = { type, data: d.integration.data as Record<string, unknown>, visible: d.integration.visible as boolean };
          setGameRows((rows) => [...rows.filter((r) => r.type !== type), row]);
        })
        .catch(() => {});
    }
  }, []);

  async function toggleGameVisibility(type: GameType) {
    try {
      const res = await fetch(`/api/integrations/${type}`, { method: "PATCH" });
      const j = await res.json();
      if (j.success) {
        setGameRows((rows) => rows.map((r) => (r.type === type ? { ...r, visible: j.visible } : r)));
      } else showToast(j.error || "Error", "error");
    } catch {
      showToast("Network error", "error");
    }
  }

  async function removeGameIntegration(type: GameType) {
    try {
      const res = await fetch(`/api/integrations/${type}`, { method: "DELETE" });
      const j = await res.json();
      if (j.success) {
        setGameRows((rows) => rows.filter((r) => r.type !== type));
        showToast(`${GAME_META[type].label} disconnected.`, "success");
      } else showToast(j.error || "Error", "error");
    } catch {
      showToast("Network error", "error");
    }
  }

  useEffect(() => {
    if (connected === "spotify") showToast("Spotify connected!", "success");
    else if (connected) showToast("Discord connected!", "success");
    if (error) {
      if (error === "already_linked") {
        showToast("That Discord account is already linked to another user.", "error");
      } else if (error.startsWith("spotify_")) {
        const msg = error === "spotify_missing_config"
          ? "Spotify integration is not configured on the server yet."
          : "Something went wrong connecting Spotify.";
        showToast(msg, "error");
      } else {
        showToast("Something went wrong connecting Discord.", "error");
      }
    }
  }, [connected, error]);

  const hasDiscordUser = !!integration?.discordUserId;
  const hasDiscordServer = !!integration?.discordServerInvite;

  async function toggleUserVisibility() {
    try {
      const res = await fetch("/api/integrations/discord", { method: "PATCH" });
      const j = await res.json();
      if (j.success) {
        setIntegration((i) => (i ? { ...i, visible: !i.visible } : i));
        showToast(j.message, "success");
      } else showToast(j.error || "Error", "error");
    } catch {
      showToast("Network error", "error");
    }
  }

  async function removeDiscordUser() {
    try {
      const res = await fetch("/api/integrations/discord", { method: "DELETE" });
      const j = await res.json();
      if (j.success) {
        showToast("Integration removed.", "success");
        setIntegration((i) => (i && i.discordServerInvite ? { ...i, discordUserId: null, discordUsername: null, discordGlobalName: null, discordAvatar: null, visible: true } : null));
      } else showToast(j.error || "Error", "error");
    } catch {
      showToast("Network error", "error");
    }
    setManageOpen(false);
  }

  async function connectDiscordServer() {
    const invite = serverInvite.trim();
    setServerError("");
    if (!/^https?:\/\/discord\.gg\/[a-zA-Z0-9-]+$/.test(invite)) {
      setServerError("Please enter a valid invite link (e.g. https://discord.gg/your-code)");
      return;
    }
    setServerSaving(true);
    try {
      const res = await fetch("/api/integrations/discord-server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite }),
      });
      const j = await res.json();
      if (j.success) {
        setServerModalOpen(false);
        showToast("Discord server added!", "success");
        setIntegration((i) => ({
          id: i?.id ?? 0,
          discordUserId: i?.discordUserId ?? null,
          discordUsername: i?.discordUsername ?? null,
          discordGlobalName: i?.discordGlobalName ?? null,
          discordAvatar: i?.discordAvatar ?? null,
          visible: i?.visible ?? true,
          discordServerInvite: invite,
          discordServerId: j.server_id,
          discordServerName: j.server_name,
          discordServerIcon: j.server_icon,
          discordServerOnline: j.online,
          discordServerTotal: j.total,
          discordServerVisible: true,
        }));
      } else {
        setServerError(j.error || "Failed to add server.");
      }
    } catch {
      setServerError("Network error. Try again.");
    } finally {
      setServerSaving(false);
    }
  }

  async function toggleServerVisibility() {
    try {
      const res = await fetch("/api/integrations/discord-server", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle" }),
      });
      const j = await res.json();
      if (j.success) {
        setIntegration((i) => (i ? { ...i, discordServerVisible: !i.discordServerVisible } : i));
        showToast(j.message, "success");
      } else showToast(j.error || "Error", "error");
    } catch {
      showToast("Network error", "error");
    }
  }

  async function removeDiscordServer() {
    try {
      const res = await fetch("/api/integrations/discord-server", { method: "DELETE" });
      const j = await res.json();
      if (j.success) {
        showToast("Discord server removed.", "success");
        setIntegration((i) => (i ? { ...i, discordServerInvite: null, discordServerId: null, discordServerName: null, discordServerIcon: null, discordServerOnline: null, discordServerTotal: null, discordServerVisible: true } : i));
      } else showToast(j.error || "Error", "error");
    } catch {
      showToast("Network error", "error");
    }
    setManageServerOpen(false);
  }

  useEffect(() => {
    if (!hasDiscordServer) return;
    async function refresh() {
      try {
        const res = await fetch("/api/integrations/discord-server", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "refresh" }),
        });
        const j = await res.json();
        if (j.success) {
          setIntegration((i) => (i ? { ...i, discordServerOnline: j.online, discordServerTotal: j.total } : i));
        }
      } catch {}
    }
    refresh();
    const iv = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [hasDiscordServer]);

  return (
    <>
      <div className="section-header">
        <h2>Available Integrations</h2>
        <p>Pick a platform to connect to your profile</p>
      </div>

      <div className="int-grid">
        {/* Discord user */}
        <div className="int-card" style={{ ["--int-color" as string]: "#5865f2" }}>
          <div className="int-card-header">
            <div className="int-card-icon discord-icon"><DiscordIcon size={22} /></div>
            <div>
              <div className="int-card-title">Discord</div>
              <div className="int-card-subtitle">User presence &amp; activity</div>
            </div>
          </div>

          {hasDiscordUser ? (
            <>
              <div className="int-status connected"><div className="int-status-dot" />Connected</div>
              <div className="discord-preview">
                <div className="discord-preview-avatar">
                  {integration?.discordAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`https://cdn.discordapp.com/avatars/${integration.discordUserId}/${integration.discordAvatar}.png?size=80`} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <DiscordIcon size={16} />
                  )}
                </div>
                <div className="discord-preview-info">
                  <div className="discord-preview-name">{integration?.discordUsername || "Unknown"}</div>
                  <div className="discord-preview-tag">ID: {integration?.discordUserId}</div>
                </div>
              </div>
              <div className="int-card-footer">
                <button className="int-btn int-btn-manage" onClick={() => setManageOpen(true)}><GearIcon /> Manage</button>
              </div>
            </>
          ) : (
            <>
              <div className="int-status disconnected"><div className="int-status-dot" />Not connected</div>
              <p className="int-card-desc">Show your Discord presence, badges, guild tag, and live activity directly on your profile.</p>
              <div className="int-card-footer">
                <Link href="/api/integrations/discord/connect" className="int-btn int-btn-discord"><DiscordIcon /> Connect Discord</Link>
              </div>
            </>
          )}
        </div>

        {/* Discord server */}
        <div className="int-card" style={{ ["--int-color" as string]: "#5865f2" }}>
          <div className="int-card-header">
            <div className="int-card-icon discord-icon"><DiscordIcon size={22} /></div>
            <div>
              <div className="int-card-title">Discord Server</div>
              <div className="int-card-subtitle">Server widget on profile</div>
            </div>
          </div>

          {hasDiscordServer ? (
            <>
              <div className="int-status connected"><div className="int-status-dot" />Connected</div>
              <div className="discord-preview">
                <div className="discord-preview-avatar">
                  {integration?.discordServerIcon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`https://cdn.discordapp.com/icons/${integration.discordServerId}/${integration.discordServerIcon}.png?size=64`} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="#5865f2" width="16" height="16"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.045.036.059a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>
                  )}
                </div>
                <div className="discord-preview-info">
                  <div className="discord-preview-name">{integration?.discordServerName || "Server"}</div>
                  <div className="discord-preview-tag">
                    <span style={{ color: "#23a55a" }}>● {(integration?.discordServerOnline ?? 0).toLocaleString()} online</span>
                    <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,.3)", flexShrink: 0 }} /> {(integration?.discordServerTotal ?? 0).toLocaleString()} members
                  </div>
                </div>
              </div>
              <div className="int-card-footer">
                <button className="int-btn int-btn-manage" onClick={() => setManageServerOpen(true)}><GearIcon /> Manage</button>
              </div>
            </>
          ) : (
            <>
              <div className="int-status disconnected"><div className="int-status-dot" />Not connected</div>
              <p className="int-card-desc">Show your Discord server widget on your profile — with live online/offline member count and a join button.</p>
              <div className="int-card-footer">
                <button className="int-btn int-btn-discord" onClick={() => setServerModalOpen(true)}><DiscordIcon size={16} /> Add Discord Server</button>
              </div>
            </>
          )}
        </div>

        {SOCIAL_TYPES.map((platform) => {
          const link = socialLinks.find((l) => l.platform === platform);
          const color = PLATFORM_COLOR[platform];
          return (
            <div className="int-card" key={platform} style={{ ["--int-color" as string]: color }}>
              <div className="int-card-header">
                <div className="int-card-icon" style={{ background: `${color}22`, border: `1px solid ${color}44`, color }}>
                  {PLATFORM_ICON[platform]}
                </div>
                <div>
                  <div className="int-card-title">{SOCIAL_LABEL[platform]}</div>
                  <div className="int-card-subtitle">Link shown on your profile</div>
                </div>
              </div>

              {link ? (
                <>
                  <div className="int-status connected"><div className="int-status-dot" />Connected</div>
                  <div className="discord-preview">
                    <div className="discord-preview-avatar" style={{ background: `${color}22`, color }}>{PLATFORM_ICON[platform]}</div>
                    <div className="discord-preview-info">
                      <div className="discord-preview-name" style={{ wordBreak: "break-all" }}>{link.url}</div>
                    </div>
                  </div>
                  <div className="int-card-footer-row">
                    <button className="int-btn int-btn-outline" onClick={() => openSocialModal(platform)}>Edit</button>
                    <button className="int-btn int-btn-danger" onClick={() => deleteSocialLink(platform)}>Remove</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="int-status disconnected"><div className="int-status-dot" />Not connected</div>
                  <p className="int-card-desc">Add your {SOCIAL_LABEL[platform]} link to show it on your profile.</p>
                  <div className="int-card-footer">
                    <button className="int-btn int-btn-primary" onClick={() => openSocialModal(platform)} style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: "#fff" }}>
                      {PLATFORM_ICON[platform]} Connect {SOCIAL_LABEL[platform]}
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div id="link-modal" className={socialModal ? "open" : ""} role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && setSocialModal(null)}>
        <div className="link-modal-box" style={{ ["--lm-color" as string]: socialModal ? PLATFORM_COLOR[socialModal] : "#6366f1", borderColor: `${socialModal ? PLATFORM_COLOR[socialModal] : "#6366f1"}30` }}>
          <button className="link-modal-close" onClick={() => setSocialModal(null)}>×</button>
          {socialModal && (
            <>
              <div className="link-modal-header">
                <div className="link-modal-icon" style={{ background: `${PLATFORM_COLOR[socialModal]}20`, border: `1px solid ${PLATFORM_COLOR[socialModal]}35`, color: PLATFORM_COLOR[socialModal] }}>
                  {PLATFORM_ICON[socialModal]}
                </div>
                <div>
                  <p className="link-modal-title">Link {SOCIAL_LABEL[socialModal]}</p>
                  <p className="link-modal-sub">Enter your {SOCIAL_LABEL[socialModal]} profile link or username.</p>
                </div>
              </div>
              <label className="link-modal-label" htmlFor="lm-social-url-input">Username / URL</label>
              <input
                id="lm-social-url-input"
                type="text"
                className="link-modal-input"
                placeholder={PLATFORM_PLACEHOLDER[socialModal]}
                autoComplete="off"
                value={socialUrlInput}
                onChange={(e) => setSocialUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveSocialLink()}
                style={{ ["--lm-color" as string]: `${PLATFORM_COLOR[socialModal]}80` }}
              />
              {socialError && <div className="link-modal-err">{socialError}</div>}
              <button className="link-modal-btn" disabled={socialSaving} onClick={saveSocialLink}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12" /></svg>
                {socialSaving ? "Saving..." : "Save"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="active-int-section">
        <div className="section-header">
          <h2>Your Integrations</h2>
          <p>Toggle visibility or remove connected platforms</p>
        </div>
        <div className="active-int-list">
          {hasDiscordUser && (
            <div className="active-int-row" style={{ ["--int-row-color" as string]: "#5865f2", ["--int-row-bg" as string]: "rgba(88,101,242,.1)", ["--int-row-border" as string]: "rgba(88,101,242,.2)" }}>
              <div className="active-int-row-icon"><DiscordIcon size={20} /></div>
              <div className="active-int-row-info">
                <div className="active-int-row-name">{integration?.discordUsername || "Discord"}</div>
                <div className="active-int-row-meta">
                  <span className={`vis-dot ${integration?.visible ? "" : "hidden"}`} />
                  Discord &middot; {integration?.visible ? "Visible on profile" : "Hidden from profile"}
                </div>
              </div>
              <div className="active-int-row-actions">
                <button className="icon-btn icon-btn-vis" title={integration?.visible ? "Hide" : "Show"} onClick={toggleUserVisibility}><EyeIcon off={!integration?.visible} /></button>
                <button className="icon-btn icon-btn-del" title="Remove" onClick={removeDiscordUser}><TrashIcon /></button>
              </div>
            </div>
          )}

          {hasDiscordServer && (
            <div className="active-int-row" style={{ ["--int-row-color" as string]: "#5865f2", ["--int-row-bg" as string]: "rgba(88,101,242,.1)", ["--int-row-border" as string]: "rgba(88,101,242,.2)" }}>
              <div className="active-int-row-icon"><DiscordIcon size={20} /></div>
              <div className="active-int-row-info">
                <div className="active-int-row-name">{integration?.discordServerName || "Discord Server"}</div>
                <div className="active-int-row-meta">
                  <span className={`vis-dot ${integration?.discordServerVisible ? "" : "hidden"}`} />
                  Discord Server &middot; {integration?.discordServerVisible ? "Visible on profile" : "Hidden from profile"}
                  &middot; <span style={{ color: "#23a55a" }}>● {(integration?.discordServerOnline ?? 0).toLocaleString()}</span> {(integration?.discordServerTotal ?? 0).toLocaleString()} members
                </div>
              </div>
              <div className="active-int-row-actions">
                <button className="icon-btn icon-btn-vis" title={integration?.discordServerVisible ? "Hide" : "Show"} onClick={toggleServerVisibility}><EyeIcon off={!integration?.discordServerVisible} /></button>
                <button className="icon-btn icon-btn-del" title="Remove server" onClick={removeDiscordServer}><TrashIcon /></button>
              </div>
            </div>
          )}

          {gameRows.map((row) => {
            const meta = GAME_META[row.type];
            return (
              <div key={row.type} className="active-int-row" style={{ ["--int-row-color" as string]: meta.color, ["--int-row-bg" as string]: `${meta.color}1a`, ["--int-row-border" as string]: `${meta.color}33` }}>
                <div className="active-int-row-icon" style={{ color: meta.color }}>{meta.icon}</div>
                <div className="active-int-row-info">
                  <div className="active-int-row-name">{meta.name(row.data)}</div>
                  <div className="active-int-row-meta">
                    <span className={`vis-dot ${row.visible ? "" : "hidden"}`} />
                    {meta.label} &middot; {row.visible ? "Visible on profile" : "Hidden from profile"}
                  </div>
                </div>
                <div className="active-int-row-actions">
                  <button className="icon-btn icon-btn-vis" title={row.visible ? "Hide" : "Show"} onClick={() => toggleGameVisibility(row.type)}><EyeIcon off={!row.visible} /></button>
                  <button className="icon-btn icon-btn-del" title="Remove" onClick={() => removeGameIntegration(row.type)}><TrashIcon /></button>
                </div>
              </div>
            );
          })}

          {!hasDiscordUser && !hasDiscordServer && gameRows.length === 0 && (
            <div className="int-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
              No integrations connected yet. Connect a platform above to get started.
            </div>
          )}
        </div>
      </div>

      {manageOpen && (
        <div className="int-modal-overlay" onClick={(e) => e.target === e.currentTarget && setManageOpen(false)}>
          <div style={{ background: "rgba(15,16,24,.97)", border: "1px solid rgba(88,101,242,.25)", borderRadius: 22, padding: "2.5rem", maxWidth: 400, width: "90%", position: "relative", boxShadow: "0 24px 80px rgba(0,0,0,.6)" }}>
            <button onClick={() => setManageOpen(false)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "rgba(255,255,255,.06)", border: "none", color: "rgba(255,255,255,.5)", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", margin: "0 0 1.5rem" }}>Manage Discord</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              <button className="int-btn int-btn-danger" onClick={removeDiscordUser}><TrashIcon /> Disconnect Discord</button>
            </div>
          </div>
        </div>
      )}

      {serverModalOpen && (
        <div className="int-modal-overlay" onClick={(e) => e.target === e.currentTarget && setServerModalOpen(false)}>
          <div style={{ background: "rgba(15,16,24,.97)", border: "1px solid rgba(88,101,242,.25)", borderRadius: 18, padding: "1.75rem 1.75rem 1.5rem", maxWidth: 420, width: "100%", position: "relative", boxShadow: "0 24px 80px rgba(0,0,0,.6)" }}>
            <button onClick={() => setServerModalOpen(false)} style={{ position: "absolute", top: ".85rem", right: ".85rem", background: "rgba(255,255,255,.08)", border: "none", color: "rgba(255,255,255,.6)", width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.4rem" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#5865f2,#404eed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 6px 20px rgba(88,101,242,.4)" }}>
                <DiscordIcon size={30} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff", margin: "0 0 .3rem" }}>Add Discord Server</h3>
                <p style={{ color: "rgba(255,255,255,.4)", fontSize: ".83rem", lineHeight: 1.55, margin: 0 }}>Paste your server&apos;s invite link and we&apos;ll fetch the stats automatically.</p>
              </div>
            </div>
            <div style={{ background: "rgba(88,101,242,.08)", border: "1px solid rgba(88,101,242,.18)", borderRadius: 10, padding: ".85rem", marginBottom: "1.2rem" }}>
              <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.55)", lineHeight: 1.6 }}>
                <strong style={{ color: "#5865f2" }}>How to get the invite link:</strong><br />
                In Discord → Right-click your server → <em>Invite People</em> → copy the link
              </div>
            </div>
            <div style={{ marginBottom: ".85rem" }}>
              <label style={{ display: "block", fontSize: ".75rem", fontWeight: 700, color: "rgba(255,255,255,.45)", marginBottom: ".4rem", letterSpacing: ".04em", textTransform: "uppercase" }}>Discord Invite Link</label>
              <input
                type="text"
                value={serverInvite}
                onChange={(e) => setServerInvite(e.target.value)}
                placeholder="https://discord.gg/your-code"
                style={{ width: "100%", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: ".7rem .9rem", color: "#fff", fontSize: ".88rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
              />
              {serverError && <div style={{ color: "#ed4245", fontSize: ".78rem", marginTop: ".4rem" }}>{serverError}</div>}
            </div>
            <button className="int-btn int-btn-discord" style={{ fontSize: ".88rem" }} disabled={serverSaving} onClick={connectDiscordServer}>
              <DiscordIcon size={16} /> {serverSaving ? "Fetching server data..." : "Add Server"}
            </button>
          </div>
        </div>
      )}

      {manageServerOpen && (
        <div className="int-modal-overlay" onClick={(e) => e.target === e.currentTarget && setManageServerOpen(false)}>
          <div style={{ background: "rgba(15,16,24,.97)", border: "1px solid rgba(88,101,242,.25)", borderRadius: 22, padding: "2.5rem", maxWidth: 400, width: "90%", position: "relative", boxShadow: "0 24px 80px rgba(0,0,0,.6)" }}>
            <button onClick={() => setManageServerOpen(false)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "rgba(255,255,255,.06)", border: "none", color: "rgba(255,255,255,.5)", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", margin: "0 0 .5rem" }}>Manage Discord Server</h3>
            {integration?.discordServerName && (
              <p style={{ color: "rgba(255,255,255,.4)", fontSize: ".82rem", margin: "0 0 1.5rem", display: "flex", alignItems: "center", gap: ".3rem", flexWrap: "wrap" }}>
                {integration.discordServerName} <span style={{ color: "rgba(255,255,255,.25)" }}>&middot;</span> <span style={{ color: "#23a55a" }}>● {(integration.discordServerOnline ?? 0).toLocaleString()} online</span> {(integration.discordServerTotal ?? 0).toLocaleString()} members
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              <button className="int-btn int-btn-danger" onClick={removeDiscordServer}><TrashIcon /> Remove Server</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
