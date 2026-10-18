"use client";

import { useEffect, useState } from "react";
import BlobCursor from "@/components/ui/BlobCursor";

// Liquid-chrome cursor for mouse/trackpad users; touch devices keep the native behaviour.
export default function SiteCursor() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setEnabled(fine.matches);
    sync();
    fine.addEventListener("change", sync);
    return () => fine.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // BlobCursor only hides the cursor on its own parent; this overlay ignores the pointer, so hide it page-wide.
    document.documentElement.classList.add("has-blob-cursor");
    return () => document.documentElement.classList.remove("has-blob-cursor");
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div className="site-cursor" aria-hidden="true">
      <BlobCursor material="chrome" color="#ffffff" size={44} hideCursor={false} />
    </div>
  );
}
