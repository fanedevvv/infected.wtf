"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { showToast } from "@/lib/toast";
import { CREW_COLORS, CREW_EMBLEMS } from "@/lib/crew-emblems";

type Member = { userId: number; role: "owner" | "officer" | "member"; username: string; slug: string | null; displayName: string; avatar: string | null; views: number };
type Request = { id: number; username: string; displayName: string; avatar: string | null };
type Group = {
  id: number; tag: string; name: string; description: string | null; color: string; emblem: string; myRole: Member["role"];
  icon: string | null; banner: string | null; strip: string | null; joinPolicy: "open" | "request" | "invite"; links: { label: string; url: string }[];
  boosts: number; level: number; views: number; maxMembers: number; members: Member[]; pendingInvites: { id: number; username: string }[]; requests: Request[];
};
type Invite = { id: number; crew: { tag: string; name: string; color: string; emblem: string; members: number } };

const LEVELS = [{ level: 1, boosts: 2 }, { level: 2, boosts: 7 }, { level: 3, boosts: 14 }];
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

/** One image slot (icon / banner / strip): preview, upload, remove. */
function MediaSlot({ kind, label, hint, path, locked, onDone }: { kind: "icon" | "banner" | "strip"; label: string; hint: string; path: string | null; locked?: string; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    setBusy(true);
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("file", file);
    try {
      const j = await fetch("/api/crews/media", { method: "POST", body: fd }).then((r) => r.json());
      if (j.success) { showToast(j.message, "success"); onDone(); } else showToast(j.error || "Error", "error");
    } catch { showToast("Network error", "error"); } finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  async function remove() {
    setBusy(true);
    try {
      const j = await fetch(`/api/crews/media?kind=${kind}`, { method: "DELETE" }).then((r) => r.json());
      if (j.success) { showToast(j.message, "success"); onDone(); } else showToast(j.error || "Error", "error");
    } finally { setBusy(false); }
  }
  return (
    <div className={`grp-media grp-media--${kind}${locked ? " is-locked" : ""}`}>
      <div className="grp-media-preview">
        {/* eslint-disable-next-line @next/next/no-img-element -- group upload */}
        {path ? <img src={`/${path}`} alt="" /> : <span>{locked ? "🔒" : "No image"}</span>}
      </div>
      <div className="grp-media-info">
        <b>{label}</b>
        <small>{locked || hint}</small>
        <div>
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy || !!locked} onClick={() => input.current?.click()}>{busy ? "Uploading…" : path ? "Replace" : "Upload"}</button>
          {path && <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={remove}>Remove</button>}
        </div>
      </div>
    </div>
  );
}

export default function CrewClient() {
  const [loaded, setLoaded] = useState(false);
  const [group, setGroup] = useState<Group | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [createCost, setCreateCost] = useState(500);
  const [boostCost, setBoostCost] = useState(250);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ tag: "", name: "", description: "", color: "#c6ff3d", emblem: "biohazard", joinPolicy: "request" as Group["joinPolicy"] });
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);
  const [inviteName, setInviteName] = useState("");

  const load = useCallback(async () => {
    const j = await fetch("/api/crews").then((r) => r.json()).catch(() => null);
    if (j?.success) {
      setGroup(j.crew); setInvites(j.invites); setCreateCost(j.createCost); setBoostCost(j.boostCost ?? 250);
      if (j.crew) {
        setForm((f) => ({ ...f, name: j.crew.name, description: j.crew.description || "", color: j.crew.color, emblem: j.crew.emblem, joinPolicy: j.crew.joinPolicy }));
        setLinks(j.crew.links);
      }
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

  if (!group) {
    const tag = form.tag.toUpperCase();
    return (
      <div className="crew-dash">
        {invites.length > 0 && (
          <div className="dash-card">
            <h3>Group invites</h3>
            <div className="crew-invites">
              {invites.map((i) => (
                <div key={i.id} className="crew-invite" style={{ ["--crew" as string]: i.crew.color }}>
                  <span className="crew-invite-emblem"><Emblem id={i.crew.emblem} /></span>
                  <div><b>{i.crew.name}</b> <span className="nt-crew">{i.crew.tag}</span><small>{i.crew.members} members</small></div>
                  <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => call({ action: "accept", inviteId: i.id })}>Join</button>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => call({ action: "decline", inviteId: i.id })}>Decline</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="dash-card">
          <h3>Start a group</h3>
          <p className="crew-sub">Your group gets a page, a tag next to every member&apos;s name and a pill on members&apos; profiles. {createCost ? `Costs ${createCost} tokens — free with Infected Plus.` : "Free with your Infected Plus."} Or <Link href="/groups">find one to join →</Link></p>
          <div className="crew-preview" style={{ ["--crew" as string]: form.color }}>
            <span className="crew-preview-emblem"><Emblem id={form.emblem} size={30} /></span>
            <b>{form.name || "Group name"}</b>
            <span className="nt-crew">{tag || "TAG"}</span>
          </div>
          <div className="crew-form">
            <label>Tag <small>2–4 letters or numbers</small>
              <input className="form-control" value={form.tag} maxLength={4} onChange={(e) => setForm({ ...form, tag: e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() })} placeholder="721" />
            </label>
            <label>Name
              <input className="form-control" value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="The Infected" />
            </label>
            <label className="crew-form-wide">About <small>optional</small>
              <textarea className="form-control" rows={2} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <div className="crew-form-wide"><StylePicker color={form.color} emblem={form.emblem} onColor={(color) => setForm({ ...form, color })} onEmblem={(emblem) => setForm({ ...form, emblem })} /></div>
          </div>
          <button type="button" className="btn btn-primary" disabled={busy || tag.length < 2 || form.name.trim().length < 2} onClick={() => call({ action: "create", tag, name: form.name, description: form.description, color: form.color, emblem: form.emblem })}>
            Create group{createCost ? ` · ${createCost} tokens` : ""}
          </button>
        </div>
      </div>
    );
  }

  const canManage = group.myRole === "owner" || group.myRole === "officer";
  const next = LEVELS.find((l) => l.boosts > group.boosts);
  const prevBoosts = [...LEVELS].reverse().find((l) => l.boosts <= group.boosts)?.boosts ?? 0;
  const pct = next ? ((group.boosts - prevBoosts) / (next.boosts - prevBoosts)) * 100 : 100;

  return (
    <div className="crew-dash">
      <div className="dash-card crew-banner" style={{ ["--crew" as string]: group.color }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- group upload */}
        <span className="crew-preview-emblem">{group.icon ? <img src={`/${group.icon}`} alt="" /> : <Emblem id={group.emblem} size={34} />}</span>
        <div className="crew-banner-text">
          <div><b>{group.name}</b> <span className="nt-crew">{group.tag}</span></div>
          <small>{group.members.length}/{group.maxMembers} members · {group.views.toLocaleString()} total views · you&apos;re {group.myRole === "owner" ? "the leader" : group.myRole}</small>
        </div>
        <Link href={`/g/${group.tag}`} className="btn btn-secondary btn-sm" target="_blank">Group page ↗</Link>
      </div>

      <div className="dash-card">
        <h3>Level {group.level} · {group.boosts} boosts</h3>
        <div className="grp-level-bar"><i style={{ width: `${pct}%` }} /></div>
        <p className="crew-sub" style={{ margin: ".5rem 0 .8rem" }}>
          {next ? `${next.boosts - group.boosts} more boost${next.boosts - group.boosts === 1 ? "" : "s"} to level ${next.level}.` : "Max level reached."} Boosts last 30 days — anyone can boost, members and fans alike.
        </p>
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => call({ action: "boost", tag: group.tag })}>Boost · {boostCost} tokens</button>
      </div>

      {canManage && group.requests.length > 0 && (
        <div className="dash-card">
          <h3>Join requests <span className="grp-badge">{group.requests.length}</span></h3>
          <div className="crew-roster">
            {group.requests.map((r) => (
              <div key={r.id} className="crew-roster-row">
                {/* eslint-disable-next-line @next/next/no-img-element -- user upload */}
                <img src={r.avatar ? `/${r.avatar}` : "/assets/img/default-avatar.png"} alt="" />
                <div><b>{r.displayName}</b><small>@{r.username}</small></div>
                <div className="crew-roster-actions">
                  <button type="button" disabled={busy} onClick={() => call({ action: "approve", requestId: r.id })}>Approve</button>
                  <button type="button" className="danger" disabled={busy} onClick={() => call({ action: "deny", requestId: r.id })}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dash-card">
        <h3>Members</h3>
        <div className="crew-roster">
          {group.members.map((m) => (
            <div key={m.userId} className="crew-roster-row">
              {/* eslint-disable-next-line @next/next/no-img-element -- user upload */}
              <img src={m.avatar ? `/${m.avatar}` : "/assets/img/default-avatar.png"} alt="" />
              <div><b>{m.displayName}</b><small>@{m.slug || m.username} · {m.views.toLocaleString()} views</small></div>
              <span className={`crew-role crew-role--${m.role}`} style={{ ["--crew" as string]: group.color }}>{m.role === "owner" ? "leader" : m.role}</span>
              <div className="crew-roster-actions">
                {group.myRole === "owner" && m.role === "member" && <button type="button" disabled={busy} onClick={() => call({ action: "promote", userId: m.userId })}>Promote</button>}
                {group.myRole === "owner" && m.role === "officer" && <button type="button" disabled={busy} onClick={() => call({ action: "demote", userId: m.userId })}>Demote</button>}
                {group.myRole === "owner" && m.role !== "owner" && <button type="button" disabled={busy} onClick={() => call({ action: "transfer", userId: m.userId }, `Hand ${group.name} over to ${m.displayName}? You'll become an officer.`)}>Make leader</button>}
                {canManage && m.role !== "owner" && !(group.myRole === "officer" && m.role === "officer") && (
                  <button type="button" className="danger" disabled={busy} onClick={() => call({ action: "kick", userId: m.userId }, `Remove ${m.displayName} from the group?`)}>Remove</button>
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
          {group.pendingInvites.length > 0 && (
            <div className="crew-pending">
              {group.pendingInvites.map((i) => (
                <span key={i.id}>@{i.username} <button type="button" onClick={() => call({ action: "cancel_invite", inviteId: i.id })} aria-label="Cancel invite">✕</button></span>
              ))}
            </div>
          )}
        </div>
      )}

      {canManage && (
        <div className="dash-card">
          <h3>Look</h3>
          <div className="grp-media-list">
            <MediaSlot kind="icon" label="Icon" hint="Square, shown on the pill, page and list." path={group.icon} onDone={load} />
            <MediaSlot kind="banner" label="Banner" hint="3:1, the top of your group page." path={group.banner} onDone={load} />
            <MediaSlot kind="strip" label="Profile strip" hint="350 × 19, shown in the group sheet on members' profiles." path={group.strip} locked={group.level < 1 ? "Unlocks at level 1 (2 boosts)." : undefined} onDone={load} />
          </div>
          <p className="crew-sub" style={{ margin: ".6rem 0 0" }}>{group.level >= 2 ? "Animated GIFs stay animated." : "Animated GIFs unlock at level 2."}</p>
        </div>
      )}

      {canManage && (
        <div className="dash-card">
          <h3>Settings</h3>
          <div className="crew-form">
            <label>Name<input className="form-control" value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Who can join
              <select className="form-control" value={form.joinPolicy} onChange={(e) => setForm({ ...form, joinPolicy: e.target.value as Group["joinPolicy"] })}>
                <option value="open">Open to all</option>
                <option value="request">Ask to join (you approve)</option>
                <option value="invite">Invite only</option>
              </select>
            </label>
            <label className="crew-form-wide">About<textarea className="form-control" rows={3} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <div className="crew-form-wide">
              <div className="grp-links-head"><b>Links</b><small>up to 6</small></div>
              {links.map((l, i) => (
                <div key={i} className="grp-link-row">
                  <input className="form-control" placeholder="Label" value={l.label} maxLength={30} onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input className="form-control" placeholder="https://…" value={l.url} maxLength={300} onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLinks(links.filter((_, j) => j !== i))} aria-label="Remove link">✕</button>
                </div>
              ))}
              {links.length < 6 && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLinks([...links, { label: "", url: "" }])}>+ Add link</button>}
            </div>
            <div className="crew-form-wide"><StylePicker color={form.color} emblem={form.emblem} onColor={(color) => setForm({ ...form, color })} onEmblem={(emblem) => setForm({ ...form, emblem })} /></div>
          </div>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => call({ action: "update", name: form.name, description: form.description, color: form.color, emblem: form.emblem, joinPolicy: form.joinPolicy, links: links.filter((l) => l.url.trim()) })}>Save</button>
        </div>
      )}

      <div className="dash-card crew-danger">
        {group.myRole === "owner" ? (
          <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => call({ action: "disband" }, `Disband ${group.name}? This can't be undone.`)}>Disband group</button>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => call({ action: "leave" }, `Leave ${group.name}?`)}>Leave group</button>
        )}
      </div>
    </div>
  );
}
