"use client";

import { useEffect, useRef } from "react";
import SafeImg from "./SafeImg";

interface Props {
  invite: string;
  serverName: string;
  serverIcon: string | null;
  serverId: string;
  online: number;
  total: number;
}

export default function DiscordServerCard({ invite, serverName, serverIcon, serverId, online, total }: Props) {
  const onlineRef = useRef<HTMLSpanElement>(null);
  const totalRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const code = invite.replace(/.*discord\.gg\//, "");
    if (!code) return;
    async function refreshCounts() {
      try {
        const res = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`);
        if (!res.ok) return;
        const json = await res.json();
        const onlineCount = json.approximate_presence_count;
        const totalCount = json.approximate_member_count;
        if (onlineCount == null || totalCount == null) return;
        if (onlineRef.current) onlineRef.current.textContent = `${onlineCount.toLocaleString()} online`;
        if (totalRef.current) totalRef.current.textContent = `${totalCount.toLocaleString()} members`;
      } catch {}
    }
    refreshCounts();
    const id = setInterval(refreshCounts, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [invite]);

  return (
    <a href={invite} target="_blank" rel="noopener noreferrer" className="discord-server-card">
      <div className="discord-server-card-header">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" width="14" height="14"><path fill="#5865F2" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z" /></svg>
        Discord Server
      </div>
      <div className="discord-server-body">
        <div className="discord-server-icon">
          {serverIcon ? (
            <SafeImg src={`https://cdn.discordapp.com/icons/${serverId}/${serverIcon}.png?size=80`} className="" alt="Server Icon" />
          ) : (
            <svg viewBox="0 0 24 24" fill="#5865f2" width="24" height="24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.045.036.059a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>
          )}
        </div>
        <div className="discord-server-info">
          <div className="discord-server-name">{serverName || "Discord Server"}</div>
          <div className="discord-server-stats">
            <span className="discord-server-online" ref={onlineRef}>{online.toLocaleString()} online</span>
            <span className="discord-server-members" ref={totalRef}>{total.toLocaleString()} members</span>
          </div>
        </div>
      </div>
    </a>
  );
}
