"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";

export default function CopyRefLinkButton({ link }: { link: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      className="ref-copy-btn"
      onClick={copy}
      style={copied ? { background: "rgba(95,239,165,.15)", borderColor: "rgba(95,239,165,.4)", color: "#5fefa5" } : undefined}
    >
      {copied ? (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15"><path d="M20 6L9 17l-5-5" /></svg>
          {t("Copied!")}
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
          {t("Copy")}
        </>
      )}
    </button>
  );
}
