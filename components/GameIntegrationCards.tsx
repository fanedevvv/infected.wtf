import { ValorantIcon, TwitchIcon } from "@/components/IntegrationIcons";

export type GameIntegration =
  | { type: "steam"; data: { steamId64: string; personaName: string; avatarUrl: string; profileUrl: string } }
  | { type: "roblox"; data: { userId: number; username: string; displayName: string; avatarUrl: string } }
  | { type: "minecraft"; data: { uuid: string; username: string; avatarUrl: string } }
  | { type: "mcserver"; data: { host: string; online: boolean; playersOnline: number; playersMax: number; motd: string; icon: string } }
  | { type: "valorant"; data: { riotId: string; tagLine: string; region: string } }
  | { type: "twitch"; data: { username: string } };

const COLORS: Record<string, string> = {
  steam: "#66c0f4",
  roblox: "#e2231a",
  minecraft: "#5cb85c",
  mcserver: "#7cb342",
  valorant: "#ff4655",
  twitch: "#9146ff",
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
        return null;
      })}
    </>
  );
}
