import { ValorantIcon, TwitchIcon, SpotifyIcon } from "@/components/IntegrationIcons";

export type GameIntegration =
  | { type: "steam"; data: { steamId64: string; personaName: string; avatarUrl: string; profileUrl: string } }
  | { type: "roblox"; data: { userId: number; username: string; displayName: string; avatarUrl: string } }
  | { type: "minecraft"; data: { uuid: string; username: string; avatarUrl: string } }
  | { type: "mcserver"; data: { host: string; online: boolean; playersOnline: number; playersMax: number; motd: string; icon: string } }
  | { type: "valorant"; data: { riotId: string; tagLine: string; region: string } }
  | { type: "twitch"; data: { username: string } }
  | {
      type: "spotify";
      data: {
        spotifyUserId: string;
        displayName: string;
        profileUrl: string;
        avatarUrl: string;
        nowPlaying: {
          isPlaying: boolean;
          trackName: string;
          artists: string;
          albumName: string;
          albumImage: string;
          trackUrl: string;
        } | null;
        recentTracks: Array<{
          trackName: string;
          artists: string;
          albumImage: string;
          playedAt: string;
          trackUrl: string;
        }>;
        lastSyncAt: string;
      };
    };

const COLORS: Record<string, string> = {
  steam: "#66c0f4",
  roblox: "#e2231a",
  minecraft: "#5cb85c",
  mcserver: "#7cb342",
  valorant: "#ff4655",
  twitch: "#9146ff",
  spotify: "#1db954",
};

function GameCardShell({ type, href, children }: { type: string; href?: string; children: React.ReactNode }) {
  const Tag = href ? "a" : "div";
  return (
    <Tag
      className="game-int-card"
      style={{ ["--int-color" as string]: COLORS[type] }}
      {...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </Tag>
  );
}

export default function GameIntegrationCards({ integrations }: { integrations: GameIntegration[] }) {
  if (integrations.length === 0) return null;
  return (
    <>
      {integrations.map((it) => {
        if (it.type === "steam") {
          return (
            <GameCardShell key="steam" type="steam" href={it.data.profileUrl}>
              <div className="game-int-icon">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {it.data.avatarUrl ? <img src={it.data.avatarUrl} alt="" /> : null}
              </div>
              <div className="game-int-info">
                <div className="game-int-name">{it.data.personaName}</div>
                <div className="game-int-sub">Steam</div>
              </div>
            </GameCardShell>
          );
        }
        if (it.type === "roblox") {
          return (
            <GameCardShell key="roblox" type="roblox" href={`https://www.roblox.com/users/${it.data.userId}/profile`}>
              <div className="game-int-icon">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {it.data.avatarUrl ? <img src={it.data.avatarUrl} alt="" /> : null}
              </div>
              <div className="game-int-info">
                <div className="game-int-name">{it.data.displayName || it.data.username}</div>
                <div className="game-int-sub">@{it.data.username}</div>
              </div>
            </GameCardShell>
          );
        }
        if (it.type === "minecraft") {
          return (
            <GameCardShell key="minecraft" type="minecraft">
              <div className="game-int-icon">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {it.data.avatarUrl ? <img src={it.data.avatarUrl} alt="" /> : null}
              </div>
              <div className="game-int-info">
                <div className="game-int-name">{it.data.username}</div>
                <div className="game-int-sub">Minecraft</div>
              </div>
            </GameCardShell>
          );
        }
        if (it.type === "mcserver") {
          return (
            <GameCardShell key="mcserver" type="mcserver">
              <div className="game-int-icon">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {it.data.icon ? <img src={it.data.icon} alt="" /> : null}
              </div>
              <div className="game-int-info">
                <div className="game-int-name">{it.data.host}</div>
                <div className="game-int-sub">
                  {it.data.online ? (
                    <span style={{ color: "#23a55a" }}>● {it.data.playersOnline}/{it.data.playersMax} online</span>
                  ) : (
                    <span style={{ color: "rgba(255,255,255,.35)" }}>○ offline</span>
                  )}
                </div>
              </div>
            </GameCardShell>
          );
        }
        if (it.type === "valorant") {
          return (
            <GameCardShell key="valorant" type="valorant">
              <div className="game-int-icon"><ValorantIcon size={18} /></div>
              <div className="game-int-info">
                <div className="game-int-name">{it.data.riotId}#{it.data.tagLine}</div>
                <div className="game-int-sub">Valorant · {it.data.region}</div>
              </div>
            </GameCardShell>
          );
        }
        if (it.type === "twitch") {
          return (
            <GameCardShell key="twitch" type="twitch" href={`https://twitch.tv/${it.data.username}`}>
              <div className="game-int-icon"><TwitchIcon size={18} /></div>
              <div className="game-int-info">
                <div className="game-int-name">{it.data.username}</div>
                <div className="game-int-sub">Twitch</div>
              </div>
            </GameCardShell>
          );
        }
        if (it.type === "spotify") {
          const now = it.data.nowPlaying;
          const recents = it.data.recentTracks.slice(0, 3);
          return (
            <GameCardShell key="spotify" type="spotify" href={now?.trackUrl || it.data.profileUrl}>
              <div className="game-int-icon">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {now?.albumImage || it.data.avatarUrl ? (
                  <img src={now?.albumImage || it.data.avatarUrl} alt="" />
                ) : (
                  <SpotifyIcon size={18} />
                )}
              </div>
              <div className="game-int-info" style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                <div className="game-int-name" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
                  <SpotifyIcon size={12} /> Spotify
                </div>
                {now ? (
                  <>
                    <div className="game-int-sub" style={{ color: "#1db954", fontWeight: 700 }}>
                      {now.isPlaying ? "Now Playing" : "Last Played"}
                    </div>
                    <div className="game-int-sub" style={{ color: "#fff", opacity: 0.92 }}>{now.trackName}</div>
                    <div className="game-int-sub">{now.artists}</div>
                  </>
                ) : recents[0] ? (
                  <>
                    <div className="game-int-sub" style={{ color: "#1db954", fontWeight: 700 }}>Recently Played</div>
                    <div className="game-int-sub" style={{ color: "#fff", opacity: 0.92 }}>{recents[0].trackName}</div>
                    <div className="game-int-sub">{recents[0].artists}</div>
                  </>
                ) : (
                  <div className="game-int-sub">Connected as {it.data.displayName}</div>
                )}
              </div>
            </GameCardShell>
          );
        }
        return null;
      })}
    </>
  );
}
