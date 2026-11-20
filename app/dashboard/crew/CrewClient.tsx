"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { showToast } from "@/lib/toast";
import { CREW_COLORS, CREW_EMBLEMS } from "@/lib/crew-emblems";

type Member = { userId: number; role: "owner" | "officer" | "member"; username: string; slug: string | null; displayName: string; avatar: string | null; views: number };
type Crew = { id: number; tag: string; name: string; description: string | null; color: string; emblem: string; myRole: Member["role"]; views: number; maxMembers: number; members: Member[]; pendingInvites: { id: number; username: string }[] };
type Invite = { id: number; crew: { tag: string; name: string; color: string; emblem: string; members: number } };

const Emblem = ({ id, size = 22 }: { id: string; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor"><path d={CREW_EMBLEMS[id] || CREW_EMBLEMS.biohazard} /></svg>
);

function StylePicker({ color, emblem, onColor, onEmblem }: { color: string; emblem: string; onColor: (c: string) => void; onEmblem: (e: string) => void }) {
  return (
    <>
      <div className="crew-pick">
        {CREW_COLORS.map((c) => (
          <button key={c} type="button" className={`crew-swatch${c === color ? " is-on" : ""}`} style={{ background: c }} onClick={() => onColor(c)} aria-label={`Color ${c}`} />
        ))}
        <input type="color" value={color} onChange={(e) => onColor(e.target.value)} aria-label="Custom color" />
      </div>
      <div className="crew-pick">
        {Object.keys(CREW_EMBLEMS).map((id) => (
          <button key={id} type="button" className={`crew-emblem-opt${id === emblem ? " is-on" : ""}`} style={{ color }} onClick={() => onEmblem(id)} aria-label={id}><Emblem id={id} /></button>
        ))}
      </div>
    </>
  );
}

export default function CrewClient() {
  const [loaded, setLoaded] = useState(false);
  const [crew, setCrew] = useState<Crew | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [createCost, setCreateCost] = useState(500);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ tag: "", name: "", description: "", color: "#c6ff3d", emblem: "biohazard" });
  const [inviteName, setInviteName] = useState("");

  const load = useCallback(async () => {
    const j = await fetch("/api/crews").then((r) => r.json()).catch(() => null);
    if (j?.success) {
      setCrew(j.crew); setInvites(j.invites); setCreateCost(j.createCost);
      if (j.crew) setForm((f) => ({ ...f, name: j.crew.name, description: j.crew.description || "", color: j.crew.color, emblem: j.crew.emblem }));
    }
    setLoaded(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function call(body: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return null;
    setBusy(true);
    try {
      const j = await fetch("/api/crews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
      if (j.success) { if (j.message) showToast(j.message, "success"); await load(); window.dispatchEvent(new Event("dash:refresh-me")); }
      else showToast(j.error || "Error", "error");
      return j;
    } catch { showToast("Network error", "error"); return null; } finally { setBusy(false); }
  }

  if (!loaded) return <div className="dash-card">Loading…</div>;

  if (!crew) {
    const tag = form.tag.toUpperCase();
    return (
      <div className="crew-dash">
        {invites.length > 0 && (
          <div className="dash-card">
            <h3>Crew invites</h3>
            <div className="crew-invites">
              {invites.map((i) => (
                <div key={i.id} className="crew-invite" style={{ ["--crew" as string]: i.crew.color }}>
                  <span className="crew-invite-emblem"><Emblem id={i.crew.emblem} /></span>
                  <div><span className="nt-crew">{i.crew.tag}</span> <b>{i.crew.name}</b><small>{i.crew.members} members</small></div>
                  <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => call({ action: "accept", inviteId: i.id })}>Join</button>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => call({ action: "decline", inviteId: i.id })}>Decline</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="dash-card">
          <h3>Start a crew</h3>
          <p className="crew-sub">Your tag shows next to every member&apos;s name across infected.wtf. {createCost ? `Costs ${createCost} tokens — free with Infected Plus.` : "Free with your Infected Plus."}</p>
          <div className="crew-preview" style={{ ["--crew" as string]: form.color }}>
            <span className="crew-preview-emblem"><Emblem id={form.emblem} size={30} /></span>
            <span className="nt-crew">{tag || "TAG"}</span>
            <b>{form.name || "Crew name"}</b>
          </div>
          <div className="crew-form">
            <label>Tag <small>2–4 letters or numbers</small>
              <input className="form-control" value={form.tag} maxLength={4} onChange={(e) => setForm({ ...form, tag: e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() })} placeholder="INFX" />
            </label>
            <label>Name
              <input className="form-control" value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="The Infected" />
            </label>
            <label className="crew-form-wide">Description <small>optional</small>
              <textarea className="form-control" rows={2} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <div className="crew-form-wide"><StylePicker color={form.color} emblem={form.emblem} onColor={(color) => setForm({ ...form, color })} onEmblem={(emblem) => setForm({ ...form, emblem })} /></div>
          </div>
          <button type="button" className="btn btn-primary" disabled={busy || tag.length < 2 || form.name.trim().length < 2} onClick={() => call({ action: "create", ...form, tag })}>
            Create crew{createCost ? ` · ${createCost} tokens` : ""}
          </button>
          <p className="crew-sub" style={{ marginTop: ".8rem" }}><Link href="/crews">See the top crews →</Link></p>
        </div>
      </div>
    );
  }

  const canManage = crew.myRole === "owner" || crew.myRole === "officer";
  return (
    <div className="crew-dash">
      <div className="dash-card crew-banner" style={{ ["--crew" as string]: crew.color }}>
        <span className="crew-preview-emblem"><Emblem id={crew.emblem} size={34} /></span>
        <div className="crew-banner-text">
          <div><span className="nt-crew">{crew.tag}</span> <b>{crew.name}</b></div>
          <small>{crew.members.length}/{crew.maxMembers} members · {crew.views.toLocaleString()} total views · you&apos;re {crew.myRole}</small>
        </div>
        <Link href={`/c/${crew.tag}`} className="btn btn-secondary btn-sm" target="_blank">Crew page ↗</Link>
      </div>

      <div className="dash-card">
        <h3>Members</h3>
        <div className="crew-roster">
          {crew.members.map((m) => (
            <div key={m.userId} className="crew-roster-row">
              {/* eslint-disable-next-line @next/next/no-img-element -- user upload */}
              <img src={m.avatar ? `/${m.avatar}` : "/assets/img/default-avatar.png"} alt="" />
              <div><b>{m.displayName}</b><small>@{m.slug || m.username} · {m.views.toLocaleString()} views</small></div>
              <span className={`crew-role crew-role--${m.role}`} style={{ ["--crew" as string]: crew.color }}>{m.role}</span>
              <div className="crew-roster-actions">
                {crew.myRole === "owner" && m.role === "member" && <button type="button" disabled={busy} onClick={() => call({ action: "promote", userId: m.userId })}>Promote</button>}
                {crew.myRole === "owner" && m.role === "officer" && <button type="button" disabled={busy} onClick={() => call({ action: "demote", userId: m.userId })}>Demote</button>}
                {crew.myRole === "owner" && m.role !== "owner" && <button type="button" disabled={busy} onClick={() => call({ action: "transfer", userId: m.userId }, `Hand ${crew.name} over to ${m.displayName}? You'll become an officer.`)}>Make owner</button>}
                {canManage && m.role !== "owner" && !(crew.myRole === "officer" && m.role === "officer") && (
                  <button type="button" className="danger" disabled={busy} onClick={() => call({ action: "kick", userId: m.userId }, `Remove ${m.displayName} from the crew?`)}>Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {canManage && (
        <div className="dash-card">
          <h3>Invite</h3>
          <div className="crew-invite-form">
            <input className="form-control" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="username" onKeyDown={(e) => { if (e.key === "Enter" && inviteName.trim()) call({ action: "invite", username: inviteName.trim() }).then((j) => j?.success && setInviteName("")); }} />
            <button type="button" className="btn btn-primary btn-sm" disabled={busy || !inviteName.trim()} onClick={() => call({ action: "invite", username: inviteName.trim() }).then((j) => j?.success && setInviteName(""))}>Send invite</button>
          </div>
          {crew.pendingInvites.length > 0 && (
            <div className="crew-pending">
              {crew.pendingInvites.map((i) => (
                <span key={i.id}>@{i.username} <button type="button" onClick={() => call({ action: "cancel_invite", inviteId: i.id })} aria-label="Cancel invite">✕</button></span>
              ))}
            </div>
          )}
        </div>
      )}

      {canManage && (
        <div className="dash-card">
          <h3>Crew settings</h3>
          <div className="crew-form">
            <label>Name<input className="form-control" value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="crew-form-wide">Description<textarea className="form-control" rows={2} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <div className="crew-form-wide"><StylePicker color={form.color} emblem={form.emblem} onColor={(color) => setForm({ ...form, color })} onEmblem={(emblem) => setForm({ ...form, emblem })} /></div>
          </div>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => call({ action: "update", name: form.name, description: form.description, color: form.color, emblem: form.emblem })}>Save</button>
        </div>
      )}

      <div className="dash-card crew-danger">
        {crew.myRole === "owner" ? (
          <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => call({ action: "disband" }, `Disband ${crew.name}? This can't be undone.`)}>Disband crew</button>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => call({ action: "leave" }, `Leave ${crew.name}?`)}>Leave crew</button>
        )}
      </div>
    </div>
  );
}
