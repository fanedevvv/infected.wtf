"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type SearchEntry = { id: string; title: string; section: string; summary: string; text: string; headings: { id: string; label: string }[] };

/** "Search docs…" box with a Ctrl/⌘ K modal and arrow-key navigation. */
export default function DocsSearch({ entries }: { entries: SearchEntry[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return entries.map((e) => ({ href: `?page=${e.id}`, title: e.title, sub: e.section }));
    const out: { href: string; title: string; sub: string; score: number }[] = [];
    for (const e of entries) {
      const hay = `${e.title} ${e.summary} ${e.text}`.toLowerCase();
      if (terms.every((t) => hay.includes(t))) {
        out.push({ href: `?page=${e.id}`, title: e.title, sub: e.summary, score: terms.some((t) => e.title.toLowerCase().includes(t)) ? 2 : 1 });
      }
      for (const h of e.headings) {
        if (terms.every((t) => h.label.toLowerCase().includes(t))) out.push({ href: `?page=${e.id}#${h.id}`, title: h.label, sub: e.title, score: 3 });
      }
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 12);
  }, [q, entries]);

  function go(href: string) {
    setOpen(false);
    window.location.href = href;
  }

  return (
    <>
      <button type="button" className="dc-search-btn" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <span>Search docs…</span>
        <kbd>Ctrl K</kbd>
      </button>
      {open && (
        <div className="dc-search-overlay" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="dc-search-modal" role="dialog" aria-modal="true" aria-label="Search docs">
            <div className="dc-search-input">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                ref={inputRef}
                value={q}
                placeholder="Search docs…"
                onChange={(e) => { setQ(e.target.value); setActive(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
                  if (e.key === "Enter" && results[active]) go(results[active].href);
                }}
              />
            </div>
            <ul className="dc-search-results">
              {results.length === 0 && <li className="dc-search-empty">No results for “{q}”</li>}
              {results.map((r, i) => (
                <li key={r.href + i}>
                  <a href={r.href} className={i === active ? "active" : ""} onMouseEnter={() => setActive(i)} onClick={(e) => { e.preventDefault(); go(r.href); }}>
                    <b>{r.title}</b>
                    <span>{r.sub}</span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="dc-search-hints"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div>
          </div>
        </div>
      )}
    </>
  );
}
