"use client";

import { useEffect } from "react";

export default function MaintenancePoller() {
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/maintenance_status", { cache: "no-store" });
        const data = await res.json();
        if (data && data.maintenance === false) window.location.href = "/";
      } catch {}
    }
    check();
    const iv = setInterval(check, 10000);
    return () => clearInterval(iv);
  }, []);
  return null;
}
