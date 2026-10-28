"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";

type Command = { label: string; href: string; icon: string; keywords?: string; external?: boolean };

function buildCommands(username: string | null, isModerator: boolean): Command[] {
  const cmds: Command[] = [
    { label: "Dashboard", href: "/dashboard", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z", keywords: "overview home" },
    { label: "Leaderboard", href: "/leaderboard", icon: "M18 20V10M12 20V4M6 20v-6" },
    { label: "Analytics", href: "/dashboard?page=analytics", icon: "M22 12h-4l-3 9L9 3l-3 9H2", keywords: "stats views referrers countries" },
    { label: "Shop", href: "/dashboard?page=shop", icon: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" },
    { label: "Marketplace", href: "/dashboard?page=marketplace", icon: "M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5", keywords: "themes templates" },
    { label: "Daily Spin", href: "/dashboard?page=spin", icon: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" },
    { label: "Decorations", href: "/dashboard?page=decorations", icon: "M12 2l2.4 7.2H22l-6 4.6 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.6h7.6z" },
    { label: "Infected Plus", href: "/dashboard?page=premium", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm2.07-7.75-.9.92C13.45 11.9 13 12.5 13 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z", keywords: "premium upgrade subscription" },
    { label: "Customize profile", href: "/dashboard?page=editor", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", keywords: "editor look colors fonts template music background" },
    { label: "Badges", href: "/dashboard?page=badges", icon: "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89 7 23l5-3 5 3-1.21-9.12" },
    { label: "Links", href: "/dashboard?page=links", icon: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" },
    { label: "Projects", href: "/dashboard?page=projects", icon: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" },
    { label: "Image Host", href: "/dashboard?page=images", icon: "M3 3h18v18H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21", keywords: "upload images cdn" },
    { label: "Referral", href: "/dashboard?page=referral", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
    { label: "Effects", href: "/dashboard?page=effects", icon: "M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2", keywords: "cursor trail avatar ring background particles" },
    { label: "Widgets", href: "/dashboard?page=integrations", icon: "M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01M9 7h6M9 11h6", keywords: "discord spotify github integrations" },
    { label: "Settings", href: "/dashboard?page=settings", icon: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z", keywords: "account email password 2fa" },
  ];
  if (isModerator) {
    cmds.unshift({ label: "Admin Panel", href: "/admin", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", keywords: "staff moderation" });
  }
  if (username) {
    cmds.push({ label: "View my profile", href: `/${username}`, icon: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z", keywords: "public live page", external: true });
  }
  return cmds;
}

export default function CommandPalette({ username, isModerator }: { username: string | null; isModerator: boolean }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo(() => buildCommands(username, isModerator), [username, isModerator]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.keywords?.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  function go(cmd: Command) {
    setOpen(false);
    if (cmd.external) window.open(cmd.href, "_blank", "noopener,noreferrer");
    else router.push(cmd.href);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIdx]) go(results[activeIdx]);
    }
  }

  return (
    <>
      <button type="button" className="cmdk-trigger" onClick={() => setOpen(true)} title={t("Search features…")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <span className="cmdk-trigger-text">{t("Search features…")}</span>
        <kbd className="cmdk-trigger-kbd">Ctrl K</kbd>
      </button>

      {open && (
        <div className="cmdk-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="cmdk-panel">
            <div className="cmdk-input-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                ref={inputRef}
                className="cmdk-input"
                placeholder={t("Search features…")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
              />
              <kbd className="cmdk-esc">Esc</kbd>
            </div>
            <div className="cmdk-list">
              {results.length === 0 ? (
                <div className="cmdk-empty">{t("No matches.")}</div>
              ) : (
                results.map((c, i) => (
                  <button
                    type="button"
                    key={c.href + c.label}
                    className={`cmdk-item ${i === activeIdx ? "active" : ""}`}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => go(c)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={c.icon} /></svg>
                    {c.label}
                    {c.external && <span className="cmdk-item-ext">↗</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
