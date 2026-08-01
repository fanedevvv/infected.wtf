"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Notification = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  icon: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications || []);
    setUnread(data.unread || 0);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function markAllRead() {
    setNotifications((n) => n.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read_all" }),
    });
  }

  async function markRead(id: number) {
    setNotifications((n) => n.map((x) => (x.id === id ? { ...x, isRead: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read_one", id }),
    });
  }

  async function remove(id: number) {
    const wasUnread = notifications.find((n) => n.id === id)?.isRead === false;
    setNotifications((n) => n.filter((x) => x.id !== id));
    if (wasUnread) setUnread((u) => Math.max(0, u - 1));
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_one", id }),
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5"
        aria-label="Notifications"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-[var(--accent-2)] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center text-black">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 gf-card p-2 z-50">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-semibold text-white/60">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-[var(--accent)] hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-white/30 text-xs px-2 py-4 text-center">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-lg px-2 py-2 text-sm ${n.isRead ? "opacity-60" : "bg-white/5"}`}
                  onClick={() => !n.isRead && markRead(n.id)}
                >
                  <div className="flex justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {n.link ? (
                        <Link href={n.link} className="font-medium block truncate hover:text-[var(--accent)]">
                          {n.title}
                        </Link>
                      ) : (
                        <div className="font-medium truncate">{n.title}</div>
                      )}
                      {n.body && <div className="text-white/40 text-xs mt-0.5 line-clamp-2">{n.body}</div>}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(n.id);
                      }}
                      className="text-white/20 hover:text-red-400 text-xs shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
