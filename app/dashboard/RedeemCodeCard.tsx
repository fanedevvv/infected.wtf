"use client";

import { useState } from "react";
import { showToast } from "@/lib/toast";

export default function RedeemCodeCard() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  async function redeem() {
    const clean = code.trim();
    if (!clean) return;
    setBusy(true);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean }),
      });
      const j = await res.json();
      if (j.success) {
        showToast(`+${j.tokens} tokens redeemed!`, "success");
        setCode("");
      } else {
        showToast(j.error || "Invalid code", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusy(false);
    }
  }

  if (dismissed) return null;

  return (
    <div className="dash-card redeem-card" style={{ marginTop: "1.5rem" }}>
      <button type="button" className="redeem-dismiss" onClick={() => setDismissed(true)} aria-label="Dismiss">✕</button>
      <div className="redeem-card-head">
        <div className="redeem-card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
        </div>
        <div>
          <div className="redeem-card-title">Redeem a code</div>
          <div className="redeem-card-sub">Enter your gift code below</div>
        </div>
      </div>
      <div className="redeem-form-row">
        <div className="redeem-input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" /></svg>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. WELCOME-2025"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && redeem()}
            maxLength={40}
          />
        </div>
      </div>
      <button type="button" className="redeem-submit-btn" onClick={redeem} disabled={busy || !code.trim()}>
        <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M12 2l1.6 5.1L19 9l-5.4 1.9L12 16l-1.6-5.1L5 9l5.4-1.9L12 2zM5 15l.7 2.3L8 18l-2.3.7L5 21l-.7-2.3L2 18l2.3-.7L5 15zm14-2 .9 2.9L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 13z" /></svg>
        {busy ? "Redeeming…" : "Redeem"}
      </button>
    </div>
  );
}
