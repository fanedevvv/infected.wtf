"use client";

import { useEffect } from "react";

export default function BanPoller({ uid }: { uid: number }) {
  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!uid) return;
    async function checkBan() {
      try {
        const res = await fetch(`/api/ban_status?uid=${uid}`, { cache: "no-store" });
        const data = await res.json();
        if (data && data.banned === false) window.location.href = "/";
      } catch {}
    }
    checkBan();
    const iv = setInterval(checkBan, 15000);
    return () => clearInterval(iv);
  }, [uid]);
  return null;
}
