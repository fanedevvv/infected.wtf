"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/toast";

type Props = {
  tag: string;
  name: string;
  loggedIn: boolean;
  state: "member" | "manager" | "requested" | "other-group" | "none";
  joinPolicy: "open" | "request" | "invite";
  boostCost: number;
  myBoostUntil: string | null;
};

/** The group page's buttons: join / ask to join / requested, boost, manage — whatever fits the viewer. */
export default function GroupActions({ tag, name, loggedIn, state, joinPolicy, boostCost, myBoostUntil }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function call(action: string) {
    setBusy(true);
    try {
      const j = await fetch("/api/crews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, tag }) }).then((r) => r.json());
      if (j.success) { showToast(j.message, "success"); router.refresh(); } else showToast(j.error || "Error", "error");
    } catch { showToast("Network error", "error"); } finally { setBusy(false); }
  }

  const share = async () => {
    const url = `${window.location.origin}/g/${tag}`;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else { await navigator.clipboard.writeText(url); showToast("Link copied!", "success"); }
    } catch {}
  };

  const primary = !loggedIn ? (
    <Link href={`/login?next=/g/${tag}`} className="gp-btn gp-btn--main">Log in to join</Link>
  ) : state === "manager" ? (
    <Link href="/dashboard?page=crew" className="gp-btn gp-btn--main">Manage group</Link>
  ) : state === "member" ? (
    <span className="gp-btn gp-btn--ghost">✓ Member</span>
  ) : state === "requested" ? (
    <button type="button" className="gp-btn gp-btn--ghost" disabled={busy} onClick={() => call("cancel_request")}>Requested · cancel</button>
  ) : state === "other-group" ? (
    <span className="gp-btn gp-btn--ghost" title="Leave your current group first">In another group</span>
  ) : joinPolicy === "open" ? (
    <button type="button" className="gp-btn gp-btn--main" disabled={busy} onClick={() => call("join")}>+ Join</button>
  ) : joinPolicy === "request" ? (
    <button type="button" className="gp-btn gp-btn--main" disabled={busy} onClick={() => call("request")}>+ Ask to join</button>
  ) : (
    <span className="gp-btn gp-btn--ghost">Invite only</span>
  );

  return (
    <div className="gp-actions">
      {primary}
      {loggedIn && (
        <button type="button" className="gp-btn gp-btn--boost" disabled={busy} onClick={() => call("boost")} title={myBoostUntil ? `Your boost lasts until ${new Date(myBoostUntil).toLocaleDateString("en-GB")}` : `Boost for 30 days · ${boostCost} tokens`}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 3h12l4 6-10 12L2 9z" /></svg>
          {myBoostUntil ? "Extend boost" : "Boost"} · {boostCost}
        </button>
      )}
      <button type="button" className="gp-btn gp-btn--icon" onClick={share} aria-label="Share group">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
      </button>
    </div>
  );
}
