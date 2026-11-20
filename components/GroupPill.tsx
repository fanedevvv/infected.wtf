"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GroupCard } from "@/lib/crews";
import { CREW_EMBLEMS } from "@/lib/crew-emblems";

/**
 * The group pill at the top of a member's profile (rage.wtf-style): icon · name · N members. Tapping it opens a
 * bottom sheet with the group's strip, level, members and a button to the group page.
 */
export default function GroupPill({ group }: { group: GroupCard }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const icon = group.icon
    // eslint-disable-next-line @next/next/no-img-element -- group upload
    ? <img src={`/${group.icon}`} alt="" />
    : <svg viewBox="0 0 24 24" fill="currentColor"><path d={CREW_EMBLEMS[group.emblem] || CREW_EMBLEMS.biohazard} /></svg>;
  const more = group.memberCount - group.members.length;

  return (
    <>
      <button type="button" className="gpill" style={{ ["--crew" as string]: group.color }} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`${group.name} — ${group.memberCount} members`}>
        <span className="gpill-icon">{icon}</span>
        <span className="gpill-name">{group.name}</span>
        <span className="gpill-count"><b>{group.memberCount}</b><span> members</span></span>
        <svg className="gpill-chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
      </button>

      {open && (
        <div className="gsheet-overlay" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="gsheet" role="dialog" aria-modal="true" aria-label={group.name} style={{ ["--crew" as string]: group.color }}>
            <i className="gsheet-handle" aria-hidden="true" />
            <div className="gsheet-top">
              <span>Group</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- group upload */}
            {group.strip && <img className="gsheet-strip" src={`/${group.strip}`} alt="" />}
            <div className="gsheet-title">
              <span className="gsheet-icon">{icon}</span>
              <b>{group.name}</b>
              <span className={`gsheet-level gp-level--${group.level}`}><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M6 3h12l4 6-10 12L2 9z" /></svg>{group.level}</span>
              <span className="gsheet-count">{group.memberCount} members</span>
            </div>
            <div className="gsheet-sub"><span>Members · {group.memberCount}</span><Link href={`/g/${group.tag}`}>See all {group.memberCount}</Link></div>
            <div className="gsheet-members">
              {group.members.map((m) => (
                <Link key={m.slug} href={`/${m.slug}`} className="gsheet-member">
                  {/* eslint-disable-next-line @next/next/no-img-element -- user upload */}
                  <img src={m.avatar ? `/${m.avatar}` : "/assets/img/default-avatar.png"} alt="" />
                  <span>{m.name}{m.owner && " 👑"}</span>
                </Link>
              ))}
            </div>
            {more > 0 && <p className="gsheet-more">and {more} more</p>}
            <Link href={`/g/${group.tag}`} className="gsheet-open">Open {group.name} ›</Link>
          </div>
        </div>
      )}
    </>
  );
}
