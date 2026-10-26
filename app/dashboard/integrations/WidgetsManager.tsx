"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { showToast } from "@/lib/toast";
import {
  SteamIcon, RobloxIcon, MinecraftIcon, ServerIcon, ValorantIcon, TwitchIcon, SpotifyIcon, GithubIcon, PinterestIcon, YoutubeIcon,
} from "@/components/IntegrationIcons";
import { PLATFORM_COLOR, PLATFORM_ICON, PLATFORM_PLACEHOLDER } from "@/lib/social-platforms";
import { useT } from "@/lib/i18n/client";

/* ── Catalog ─────────────────────────────────────────────────────────────── */

const GAME_TYPES = ["steam", "roblox", "minecraft", "mcserver", "valorant", "twitch", "spotify", "github", "pinterest", "youtube"] as const;
type GameType = (typeof GAME_TYPES)[number];
const SOCIAL_TYPES = ["instagram", "twitter", "youtube", "tiktok", "website"] as const;
type SocialType = (typeof SOCIAL_TYPES)[number];

type Category = "discord" | "gaming" | "music" | "social" | "links";
const CATEGORIES: { id: Category | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "discord", label: "Discord" },
  { id: "gaming", label: "Gaming" },
  { id: "music", label: "Music" },
  { id: "social", label: "Social" },
  { id: "links", label: "Links" },
];

type Field = { name: string; placeholder: string };
type Setup =
  | { kind: "discord" }
  | { kind: "discord-server" }
  | { kind: "oauth"; href: string; steamCode?: boolean }
  | { kind: "form"; fields: Field[] }
  | { kind: "link"; platform: SocialType };

type WidgetDef = { key: string; title: string; desc: string; category: Category; color: string; icon: ReactNode; setup: Setup };

const DiscordIcon = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 127.14 96.36" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z" />
  </svg>
);

const SOCIAL_LABEL: Record<SocialType, string> = { instagram: "Instagram", twitter: "Twitter / X", youtube: "YouTube", tiktok: "TikTok", website: "Website" };

const WIDGETS: WidgetDef[] = [
  { key: "discord", title: "Discord", desc: "Live presence, badges and activity", category: "discord", color: "#5865f2", icon: <DiscordIcon />, setup: { kind: "discord" } },
  { key: "discord-server", title: "Discord Server", desc: "Server card with live member count and a join button", category: "discord", color: "#5865f2", icon: <DiscordIcon />, setup: { kind: "discord-server" } },
  { key: "steam", title: "Steam", desc: "Your Steam profile", category: "gaming", color: "#66c0f4", icon: <SteamIcon size={18} />, setup: { kind: "oauth", href: "/api/integrations/steam/connect", steamCode: true } },
  { key: "roblox", title: "Roblox", desc: "Your Roblox username and avatar", category: "gaming", color: "#e2231a", icon: <RobloxIcon size={18} />, setup: { kind: "form", fields: [{ name: "username", placeholder: "Roblox username" }] } },
  { key: "minecraft", title: "Minecraft", desc: "Your Minecraft username and skin", category: "gaming", color: "#5cb85c", icon: <MinecraftIcon size={18} />, setup: { kind: "form", fields: [{ name: "username", placeholder: "Minecraft username" }] } },
  { key: "mcserver", title: "MC Server", desc: "Live status of a Minecraft server", category: "gaming", color: "#7cb342", icon: <ServerIcon size={18} />, setup: { kind: "form", fields: [{ name: "host", placeholder: "play.hypixel.net" }] } },
  { key: "valorant", title: "Valorant", desc: "Your Riot ID (self-reported)", category: "gaming", color: "#ff4655", icon: <ValorantIcon size={18} />, setup: { kind: "form", fields: [{ name: "riotId", placeholder: "Riot name" }, { name: "tagLine", placeholder: "Tag (without #)" }, { name: "region", placeholder: "Region (NA/EU/AP/KR/BR/LATAM)" }] } },
  { key: "twitch", title: "Twitch", desc: "Your Twitch channel", category: "gaming", color: "#9146ff", icon: <TwitchIcon size={18} />, setup: { kind: "form", fields: [{ name: "username", placeholder: "Twitch username" }] } },
  { key: "spotify", title: "Spotify", desc: "Now playing and recently played", category: "music", color: "#1db954", icon: <SpotifyIcon size={18} />, setup: { kind: "oauth", href: "/api/integrations/spotify/connect" } },
  { key: "github", title: "GitHub", desc: "Your GitHub profile and repo count", category: "social", color: "#f0f6fc", icon: <GithubIcon size={18} />, setup: { kind: "form", fields: [{ name: "username", placeholder: "GitHub username" }] } },
  { key: "pinterest", title: "Pinterest", desc: "A pin, board or profile", category: "social", color: "#e60023", icon: <PinterestIcon size={18} />, setup: { kind: "form", fields: [{ name: "url", placeholder: "Pinterest profile or board link" }] } },
  { key: "youtube", title: "YouTube Channel", desc: "Your channel card with avatar", category: "social", color: "#ff0000", icon: <YoutubeIcon size={18} />, setup: { kind: "form", fields: [{ name: "url", placeholder: "youtube.com/@yourchannel" }] } },
  ...SOCIAL_TYPES.map((p): WidgetDef => ({
    key: `link:${p}`, title: p === "youtube" ? "YouTube Link" : SOCIAL_LABEL[p], desc: "A link button on your profile", category: "links",
    color: PLATFORM_COLOR[p], icon: PLATFORM_ICON[p], setup: { kind: "link", platform: p },
  })),
];
const WIDGET_BY_KEY = Object.fromEntries(WIDGETS.map((w) => [w.key, w])) as Record<string, WidgetDef>;

/** One-line summary of a connected game/music/social widget for the list. */
function summarize(type: GameType, d: Record<string, unknown>): { name: string; sub: string; img?: string } {
  const s = (v: unknown) => (v == null ? "" : String(v));
  const img = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  switch (type) {
    case "steam": return { name: s(d.personaName) || "Steam", sub: "Steam", img: img(d.avatarUrl) };
    case "roblox": return { name: s(d.displayName || d.username), sub: `@${s(d.username)}`, img: img(d.avatarUrl) };
    case "minecraft": return { name: s(d.username), sub: "Minecraft", img: img(d.avatarUrl) };
    case "mcserver": return { name: s(d.host), sub: d.online ? `${s(d.playersOnline ?? 0)}/${s(d.playersMax ?? 0)} online` : "offline (last check)", img: img(d.icon) };
    case "valorant": return { name: `${s(d.riotId)}#${s(d.tagLine)}`, sub: `Valorant · ${s(d.region)}` };
    case "twitch": return { name: s(d.username), sub: `twitch.tv/${s(d.username)}` };
    case "spotify": {
      const now = (d.nowPlaying as Record<string, unknown> | null) || null;
      if (now && now.trackName) return { name: s(now.trackName), sub: `${now.isPlaying ? "Now playing" : "Last played"} · ${s(now.artists)}`, img: img(now.albumImage) };
      return { name: s(d.displayName) || "Spotify", sub: "Spotify", img: img(d.avatarUrl) };
    }
    case "github": return { name: s(d.name || d.username), sub: `${s(d.publicRepos ?? 0)} repos · ${s(d.followers ?? 0)} followers`, img: img(d.avatarUrl) };
    case "pinterest": return { name: s(d.title) || "Pinterest", sub: d.authorName ? `Pinterest · ${s(d.authorName)}` : "Pinterest", img: img(d.thumbnailUrl) };
    case "youtube": return { name: s(d.name) || "YouTube", sub: "YouTube channel", img: img(d.avatarUrl) };
  }
}

/* ── Types ───────────────────────────────────────────────────────────────── */

type SocialLink = { id: number; platform: string; url: string };
type GameRow = { data: Record<string, unknown>; visible: boolean };
export type DiscordIntegration = {
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

type ActiveWidget = {
  key: string;
  name: string;
  sub: string;
  img?: string;
  visible?: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  onRemove: () => Promise<void>;
};

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

/* ── Main ────────────────────────────────────────────────────────────────── */

export default function WidgetsManager({
  initialIntegration,
  initialSocialLinks,
  error,
  connected,
  embedded = false,
}: {
  initialIntegration: DiscordIntegration;
  initialSocialLinks: SocialLink[];
  error?: string;
  connected?: string;
  /** Inside the profile editor's Widgets tile, which already has its own heading. */
  embedded?: boolean;
}) {
  const t = useT();
  const [integration, setIntegration] = useState<DiscordIntegration>(initialIntegration);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(initialSocialLinks);
  const [games, setGames] = useState<Partial<Record<GameType, GameRow>>>({});
  const [gamesLoaded, setGamesLoaded] = useState(false);
  // null = closed, "" = catalog, otherwise the widget being set up
  const [picker, setPicker] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      GAME_TYPES.map((type) =>
        fetch(`/api/integrations/${type}`)
          .then((r) => r.json())
          .then((d) => [type, d.integration ? { data: d.integration.data as Record<string, unknown>, visible: !!d.integration.visible } : null] as const)
          .catch(() => [type, null] as const),
      ),
    ).then((rows) => {
      if (cancelled) return;
      const next: Partial<Record<GameType, GameRow>> = {};
      for (const [type, row] of rows) if (row) next[type] = row;
      setGames(next);
      setGamesLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (connected === "spotify") showToast(t("Spotify connected!"), "success");
    else if (connected) showToast(t("Discord connected!"), "success");
    if (!error) return;
    if (error === "already_linked") showToast(t("That Discord account is already linked to another user."), "error");
    else if (error === "spotify_missing_config") showToast(t("Spotify integration is not configured on the server yet."), "error");
    else if (error.startsWith("spotify_")) showToast(t("Something went wrong connecting Spotify."), "error");
    else showToast(t("Something went wrong connecting Discord."), "error");
  }, [connected, error, t]);

  const hasDiscordServer = !!integration?.discordServerInvite;
  // Keep the server's member count fresh while the page is open.
  useEffect(() => {
    if (!hasDiscordServer) return;
    async function refresh() {
      try {
        const j = await api("/api/integrations/discord-server", "PATCH", { action: "refresh" });
        if (j.success) setIntegration((i) => (i ? { ...i, discordServerOnline: j.online, discordServerTotal: j.total } : i));
      } catch {}
    }
    refresh();
    const iv = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [hasDiscordServer]);

  useEffect(() => {
    if (picker === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPicker(null); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [picker]);

  async function run(promise: Promise<{ success?: boolean; error?: string; message?: string }>, ok?: string) {
    try {
      const j = await promise;
      if (j.success) {
        if (ok || j.message) showToast(ok || j.message!, "success");
        return j;
      }
      showToast(j.error || t("Error"), "error");
    } catch {
      showToast(t("Network error"), "error");
    }
    return null;
  }

  /* Everything connected, as one list. */
  const active: ActiveWidget[] = [];
  if (integration?.discordUserId) {
    active.push({
      key: "discord",
      name: integration.discordGlobalName || integration.discordUsername || "Discord",
      sub: integration.discordUsername ? `@${integration.discordUsername}` : "Discord",
      img: integration.discordAvatar ? `https://cdn.discordapp.com/avatars/${integration.discordUserId}/${integration.discordAvatar}.png?size=80` : undefined,
      visible: integration.visible,
      onToggle: async () => {
        if (await run(api("/api/integrations/discord", "PATCH"))) setIntegration((i) => (i ? { ...i, visible: !i.visible } : i));
      },
      onRemove: async () => {
        if (await run(api("/api/integrations/discord", "DELETE"), t("Integration removed."))) {
          setIntegration((i) => (i && i.discordServerInvite ? { ...i, discordUserId: null, discordUsername: null, discordGlobalName: null, discordAvatar: null, visible: true } : null));
        }
      },
    });
  }
  if (integration?.discordServerInvite) {
    active.push({
      key: "discord-server",
      name: integration.discordServerName || "Discord Server",
      sub: `${(integration.discordServerOnline ?? 0).toLocaleString()} online · ${(integration.discordServerTotal ?? 0).toLocaleString()} members`,
      img: integration.discordServerIcon ? `https://cdn.discordapp.com/icons/${integration.discordServerId}/${integration.discordServerIcon}.png?size=64` : undefined,
      visible: integration.discordServerVisible,
      onToggle: async () => {
        if (await run(api("/api/integrations/discord-server", "PATCH", { action: "toggle" }))) setIntegration((i) => (i ? { ...i, discordServerVisible: !i.discordServerVisible } : i));
      },
      onRemove: async () => {
        if (await run(api("/api/integrations/discord-server", "DELETE"), t("Discord server removed."))) {
          setIntegration((i) => (i ? { ...i, discordServerInvite: null, discordServerId: null, discordServerName: null, discordServerIcon: null, discordServerOnline: null, discordServerTotal: null, discordServerVisible: true } : i));
        }
      },
    });
  }
  for (const type of GAME_TYPES) {
    const row = games[type];
    if (!row) continue;
    const sum = summarize(type, row.data);
    active.push({
      key: type,
      ...sum,
      visible: row.visible,
      onToggle: async () => {
        const j = await run(api(`/api/integrations/${type}`, "PATCH")) as { visible?: boolean } | null;
        if (j) setGames((g) => ({ ...g, [type]: { ...row, visible: !!j.visible } }));
      },
      onRemove: async () => {
        if (await run(api(`/api/integrations/${type}`, "DELETE"), t("{name} disconnected.", { name: WIDGET_BY_KEY[type].title }))) {
          setGames((g) => { const next = { ...g }; delete next[type]; return next; });
        }
      },
    });
  }
  for (const p of SOCIAL_TYPES) {
    const link = socialLinks.find((l) => l.platform === p);
    if (!link) continue;
    active.push({
      key: `link:${p}`,
      name: SOCIAL_LABEL[p],
      sub: link.url.replace(/^https?:\/\/(www\.)?/, ""),
      onEdit: () => setPicker(`link:${p}`),
      onRemove: async () => {
        if (await run(api(`/api/links/${link.id}`, "DELETE"), t("Link removed."))) setSocialLinks((ls) => ls.filter((l) => l.id !== link.id));
      },
    });
  }

  const activeKeys = new Set(active.map((a) => a.key));

  return (
    <>
      <div className={`wm-head${embedded ? " wm-head--embedded" : ""}`}>
        {embedded ? (
          <span className="lab-label">{t("Your widgets")} · {active.length}</span>
        ) : (
          <div>
            <h2>{t("Widgets")}</h2>
            <p>{t("Everything connected to your profile. Add, hide or remove widgets here.")}</p>
          </div>
        )}
        <button type="button" className="lab-btn lab-btn--solid" onClick={() => setPicker("")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" width="14" height="14"><path d="M12 5v14M5 12h14" /></svg>
          {t("Add widget")}
        </button>
      </div>

      <div className="wm-list">
        {active.map((w) => {
          const def = WIDGET_BY_KEY[w.key];
          const hidden = w.visible === false;
          return (
            <div key={w.key} className={`wm-row${hidden ? " is-hidden" : ""}`} style={{ ["--wm-color" as string]: def.color }}>
              <div className="wm-row-icon">
                {w.img ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote avatars/art from the connected platform
                  <img src={w.img} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : def.icon}
                <span className="wm-row-badge">{def.icon}</span>
              </div>
              <div className="wm-row-info">
                <div className="wm-row-name">{w.name}</div>
                <div className="wm-row-sub"><span className="wm-row-type">{t(def.title)}</span>{w.sub && w.sub !== def.title ? ` · ${w.sub}` : ""}</div>
              </div>
              {confirmKey === w.key ? (
                <div className="wm-row-actions">
                  <span className="wm-confirm-text">{t("Remove?")}</span>
                  <button type="button" className="wm-act wm-act--danger" onClick={async () => { await w.onRemove(); setConfirmKey(null); }}>{t("Remove")}</button>
                  <button type="button" className="wm-act" onClick={() => setConfirmKey(null)}>{t("Cancel")}</button>
                </div>
              ) : (
                <div className="wm-row-actions">
                  {w.onToggle && (
                    <button type="button" className={`wm-switch${hidden ? "" : " is-on"}`} onClick={w.onToggle} title={hidden ? t("Show on profile") : t("Hide from profile")} aria-pressed={!hidden}>
                      <span />
                    </button>
                  )}
                  {w.onEdit && <button type="button" className="wm-act" onClick={w.onEdit}>{t("Edit")}</button>}
                  <button type="button" className="wm-act wm-act--icon" onClick={() => setConfirmKey(w.key)} title={t("Remove")} aria-label={t("Remove")}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {!gamesLoaded && <div className="wm-loading">{t("Loading…")}</div>}

        {gamesLoaded && active.length === 0 && (
          <button type="button" className="wm-empty" onClick={() => setPicker("")}>
            <span className="wm-empty-plus">+</span>
            <b>{t("No widgets yet")}</b>
            <span>{t("Add Discord, Spotify, games or social links to your profile.")}</span>
          </button>
        )}
      </div>

      {picker !== null && (
        <div className="lab-modal-overlay" onClick={(e) => e.target === e.currentTarget && setPicker(null)}>
          <div className="lab-modal wm-modal" role="dialog" aria-modal="true">
            <button className="lab-modal-close" onClick={() => setPicker(null)} aria-label={t("Close")}>✕</button>
            {picker === "" ? (
              <Catalog activeKeys={activeKeys} onPick={(key) => setPicker(key)} />
            ) : (
              <SetupPanel
                def={WIDGET_BY_KEY[picker]}
                onBack={() => setPicker("")}
                existingLink={picker.startsWith("link:") ? socialLinks.find((l) => `link:${l.platform}` === picker) : undefined}
                onGame={(type, data) => {
                  setGames((g) => ({ ...g, [type]: { data, visible: true } }));
                  showToast(t("{name} connected!", { name: WIDGET_BY_KEY[type].title }), "success");
                  setPicker(null);
                }}
                onServer={(server) => {
                  setIntegration((i) => ({
                    id: i?.id ?? 0,
                    discordUserId: i?.discordUserId ?? null,
                    discordUsername: i?.discordUsername ?? null,
                    discordGlobalName: i?.discordGlobalName ?? null,
                    discordAvatar: i?.discordAvatar ?? null,
                    visible: i?.visible ?? true,
                    discordServerVisible: true,
                    ...server,
                  }));
                  showToast(t("Discord server added!"), "success");
                  setPicker(null);
                }}
                onLink={(link, isNew) => {
                  setSocialLinks((ls) => (isNew ? [...ls, link] : ls.map((l) => (l.id === link.id ? link : l))));
                  showToast(isNew ? t("Link added!") : t("Link updated!"), "success");
                  setPicker(null);
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Catalog step ────────────────────────────────────────────────────────── */

function Catalog({ activeKeys, onPick }: { activeKeys: Set<string>; onPick: (key: string) => void }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const q = query.trim().toLowerCase();
  const shown = WIDGETS.filter((w) => (category === "all" || w.category === category) && (!q || w.title.toLowerCase().includes(q) || w.desc.toLowerCase().includes(q)));

  return (
    <>
      <span className="lab-label"><span className="lab-dot" /> {t("Add widget")}</span>
      <h2 className="lab-modal-title">{t("Pick a widget")}</h2>
      <div className="wm-catalog-controls">
        <input className="form-control" placeholder={t("Search widgets...")} value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        <div className="wm-tabs">
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" className={`wm-tab${category === c.id ? " is-active" : ""}`} onClick={() => setCategory(c.id)}>{t(c.label)}</button>
          ))}
        </div>
      </div>
      <div className="wm-catalog">
        {shown.map((w) => {
          const added = activeKeys.has(w.key);
          const editable = added && w.setup.kind === "link";
          return (
            <button
              key={w.key}
              type="button"
              className={`wm-tile${added ? " is-added" : ""}`}
              style={{ ["--wm-color" as string]: w.color }}
              disabled={added && !editable}
              onClick={() => onPick(w.key)}
            >
              <span className="wm-tile-icon">{w.icon}</span>
              <span className="wm-tile-text">
                <b>{t(w.title)}</b>
                <span>{t(w.desc)}</span>
              </span>
              <span className="wm-tile-state">{added ? (editable ? t("Edit") : t("Added")) : "+"}</span>
            </button>
          );
        })}
        {shown.length === 0 && <div className="wm-loading">{t("No widgets match your search.")}</div>}
      </div>
    </>
  );
}

/* ── Setup step ──────────────────────────────────────────────────────────── */

type ServerPatch = Pick<NonNullable<DiscordIntegration>, "discordServerInvite" | "discordServerId" | "discordServerName" | "discordServerIcon" | "discordServerOnline" | "discordServerTotal">;

function SetupPanel({
  def,
  onBack,
  existingLink,
  onGame,
  onServer,
  onLink,
}: {
  def: WidgetDef;
  onBack: () => void;
  existingLink?: SocialLink;
  onGame: (type: GameType, data: Record<string, unknown>) => void;
  onServer: (server: ServerPatch) => void;
  onLink: (link: SocialLink, isNew: boolean) => void;
}) {
  const t = useT();
  const setup = def.setup;
  const [values, setValues] = useState<Record<string, string>>(() => (setup.kind === "link" && existingLink ? { url: existingLink.url } : {}) as Record<string, string>);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      if (setup.kind === "form") {
        const j = await api(`/api/integrations/${def.key}`, "POST", values);
        if (j.success) onGame(def.key as GameType, j.data);
        else setErr(j.error || t("Something went wrong."));
      } else if (setup.kind === "discord-server") {
        const invite = (values.invite || "").trim();
        if (!/^https?:\/\/discord\.gg\/[a-zA-Z0-9-]+$/.test(invite)) {
          setErr(t("Please enter a valid invite link (e.g. https://discord.gg/your-code)"));
          return;
        }
        const j = await api("/api/integrations/discord-server", "POST", { invite });
        if (j.success) {
          onServer({ discordServerInvite: invite, discordServerId: j.server_id, discordServerName: j.server_name, discordServerIcon: j.server_icon, discordServerOnline: j.online, discordServerTotal: j.total });
        } else setErr(j.error || t("Failed to add server."));
      } else if (setup.kind === "link") {
        let url = (values.url || "").trim();
        if (!url) { setErr(t("Please enter a URL or username.")); return; }
        if (!/^https?:\/\//.test(url)) url = "https://" + url.replace(/^@/, "");
        const j = existingLink
          ? await api(`/api/links/${existingLink.id}`, "PATCH", { url })
          : await api("/api/links", "POST", { platform: setup.platform, url });
        if (j.success) onLink(existingLink ? { ...existingLink, url } : { id: j.link.id, platform: j.link.platform, url: j.link.url }, !existingLink);
        else setErr(j.error || t("Failed to save link."));
      }
    } catch {
      setErr(t("Network error. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  const field = (name: string, placeholder: string, autoFocus = false) => (
    <input
      key={name}
      className="form-control"
      placeholder={placeholder}
      value={values[name] || ""}
      onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
      onKeyDown={(e) => e.key === "Enter" && !busy && submit()}
      autoFocus={autoFocus}
      autoComplete="off"
    />
  );

  return (
    <>
      <button type="button" className="lab-modal-link wm-back" onClick={onBack}>← {t("All widgets")}</button>
      <div className="wm-setup-head" style={{ ["--wm-color" as string]: def.color }}>
        <span className="wm-tile-icon">{def.icon}</span>
        <div>
          <h2 className="lab-modal-title">{t(def.title)}</h2>
          <p className="lab-modal-sub">{t(def.desc)}</p>
        </div>
      </div>

      {setup.kind === "discord" && (
        <>
          <p className="lab-modal-sub">{t("Show your Discord presence, badges, guild tag, and live activity directly on your profile.")}</p>
          <Link href="/api/integrations/discord/connect" prefetch={false} className="lab-btn lab-btn--solid lab-btn--lg lab-btn--block"><DiscordIcon /> {t("Connect Discord")}</Link>
        </>
      )}

      {setup.kind === "oauth" && (
        <>
          <Link href={setup.href} prefetch={false} className="lab-btn lab-btn--solid lab-btn--lg lab-btn--block">{def.icon} {t("Connect {name}", { name: def.title })}</Link>
          {setup.steamCode && <SteamCodeConnect onConnected={(data) => onGame("steam", data)} />}
        </>
      )}

      {setup.kind === "discord-server" && (
        <div className="wm-form">
          <p className="wm-hint">{t("In Discord → Right-click your server →")} <em>{t("Invite People")}</em> {t("→ copy the link")}</p>
          {field("invite", "https://discord.gg/your-code", true)}
          {err && <div className="lab-modal-err">{err}</div>}
          <button type="button" className="lab-btn lab-btn--solid lab-btn--lg lab-btn--block" disabled={busy} onClick={submit}>{busy ? t("Fetching server data...") : t("Add Server")}</button>
        </div>
      )}

      {setup.kind === "form" && (
        <div className="wm-form">
          {setup.fields.map((f, i) => field(f.name, t(f.placeholder), i === 0))}
          {err && <div className="lab-modal-err">{err}</div>}
          <button type="button" className="lab-btn lab-btn--solid lab-btn--lg lab-btn--block" disabled={busy} onClick={submit}>{busy ? t("Connecting…") : t("Connect")}</button>
        </div>
      )}

      {setup.kind === "link" && (
        <div className="wm-form">
          {field("url", PLATFORM_PLACEHOLDER[setup.platform], true)}
          {err && <div className="lab-modal-err">{err}</div>}
          <button type="button" className="lab-btn lab-btn--solid lab-btn--lg lab-btn--block" disabled={busy} onClick={submit}>{busy ? t("Saving…") : existingLink ? t("Save") : t("Add link")}</button>
        </div>
      )}
    </>
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
      return await api("/api/integrations/steam/verify", "POST", body);
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
          <button type="button" className="lab-btn lab-btn--ghost" onClick={start} disabled={busy || !profile.trim()}>{busy ? "…" : t("Continue")}</button>
        </>
      ) : (
        <>
          <div className="steam-alt-who">
            {pending.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- Steam avatar CDN
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
            <button type="button" className="lab-btn lab-btn--solid" onClick={verify} disabled={busy}>{busy ? t("Checking…") : t("Verify")}</button>
            <a className="lab-btn lab-btn--ghost" href={`https://steamcommunity.com/profiles/${pending.steamId64}/edit/info`} target="_blank" rel="noopener noreferrer">{t("Open Steam profile")}</a>
            <button type="button" className="lab-btn lab-btn--ghost" onClick={() => { setPending(null); setError(""); }}>{t("Back")}</button>
          </div>
        </>
      )}
    </div>
  );
}
