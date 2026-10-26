import type { Metadata } from "next";
import { isValidElement, type ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { DISCORD_INVITE, DOC_PAGES, DOC_SECTIONS, SITE, findDoc } from "@/lib/docs";
import DocsSearch from "@/components/docs/DocsSearch";
import { LabMark, LabWordmark } from "@/components/lab/LabMark";

export const dynamic = "force-dynamic";

const DOCS = "https://docs.infected.wtf";

/** Plain text of a JSX tree, used for search and reading-time estimates. */
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode; items?: ReactNode[]; rows?: ReactNode[][]; head?: string[]; title?: string };
    return [props.title, props.head?.join(" "), props.items?.map(textOf).join(" "), props.rows?.flat().map(textOf).join(" "), textOf(props.children)].filter(Boolean).join(" ");
  }
  return "";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ page?: string }> }): Promise<Metadata> {
  const doc = findDoc((await searchParams).page);
  return {
    title: `${doc.title} | INFECTED.WTF Docs`,
    description: doc.summary,
    openGraph: { title: `${doc.title} — INFECTED.WTF Docs`, description: doc.summary, siteName: "INFECTED.WTF Docs", url: `${DOCS}/?page=${doc.id}` },
  };
}

export default async function DocsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const doc = findDoc((await searchParams).page);
  const index = DOC_PAGES.indexOf(doc);
  const prev = DOC_PAGES[index - 1];
  const next = DOC_PAGES[index + 1];
  const words = textOf(doc.body).split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));

  const searchEntries = DOC_PAGES.map((p) => ({ id: p.id, title: p.title, section: p.section, summary: p.summary, text: `${p.keywords} ${textOf(p.body)}`, headings: p.toc }));

  const stats = doc.id === "getting-started"
    ? await Promise.all([prisma.user.count(), prisma.profile.aggregate({ _sum: { views: true } })]).then(([users, v]) => ({ users, views: v._sum.views ?? 0 })).catch(() => null)
    : null;

  const sidebar = (
    <nav className="dc-nav" aria-label="Documentation">
      {DOC_SECTIONS.map((section) => (
        <div key={section} className="dc-nav-group">
          <div className="dc-nav-label">{section}</div>
          {DOC_PAGES.filter((p) => p.section === section).map((p) => (
            <a key={p.id} href={`?page=${p.id}`} className={p.id === doc.id ? "active" : ""} aria-current={p.id === doc.id ? "page" : undefined}>{p.title}</a>
          ))}
        </div>
      ))}
      <div className="dc-nav-foot">
        <a href={SITE}>infected.wtf ↗</a>
        <a href={DISCORD_INVITE} target="_blank" rel="noopener">Discord ↗</a>
      </div>
    </nav>
  );

  return (
    <div className="dc-root">
      <header className="dc-header">
        <a href="?page=getting-started" className="dc-brand">
          <LabWordmark />
          <em>docs</em>
        </a>
        <DocsSearch entries={searchEntries} />
        <div className="dc-header-links">
          <a href="?page=changelog">Changelog <span className="dc-ver">v2.0</span></a>
          <a href={DISCORD_INVITE} target="_blank" rel="noopener">Discord</a>
          <a href={`${SITE}/dashboard`} className="dc-cta">Dashboard</a>
        </div>
      </header>

      <div className="dc-layout">
        <aside className="dc-sidebar">{sidebar}</aside>

        <main className="dc-main">
          <details className="dc-mobile-nav">
            <summary>{doc.section} · {doc.title}</summary>
            {sidebar}
          </details>

          <div className="dc-crumbs"><a href="?page=getting-started">Docs</a><span>›</span>{doc.section}<span>›</span><b>{doc.title}</b></div>
          <h1 className="dc-title">{doc.id === "getting-started" ? "Welcome to infected.wtf" : doc.title}</h1>
          <p className="dc-summary">{doc.summary}</p>
          <div className="dc-meta">{minutes} min read</div>

          {stats && (
            <div className="dc-stats">
              <div><b>{stats.users.toLocaleString()}+</b><span>accounts</span></div>
              <div><b>{stats.views.toLocaleString()}+</b><span>profile views</span></div>
              <div><b>~2 min</b><span>to set up</span></div>
            </div>
          )}

          <article className="dc-body">{doc.body}</article>

          <div className="dc-pager">
            {prev ? <a href={`?page=${prev.id}`} className="dc-pager-prev"><span>← Previous</span><b>{prev.title}</b></a> : <span />}
            {next ? <a href={`?page=${next.id}`} className="dc-pager-next"><span>Next →</span><b>{next.title}</b></a> : <span />}
          </div>

          <div className="dc-help">
            <div>
              <b>Need a hand?</b>
              <span>Ask in the #support channel on Discord — we usually answer within a few hours.</span>
            </div>
            <a href={DISCORD_INVITE} target="_blank" rel="noopener">Open Discord</a>
          </div>
        </main>

        <aside className="dc-toc">
          <div className="dc-toc-label">On this page</div>
          {doc.toc.map((h) => <a key={h.id} href={`#${h.id}`}>{h.label}</a>)}
        </aside>
      </div>

      <footer className="dc-footer">
        <div className="dc-footer-brand">
          <LabMark size={18} className="lab-wordmark-mark" />
          <span>© {new Date().getFullYear()} infected.wtf</span>
        </div>
        <div className="dc-footer-links">
          <a href="?page=changelog">Changelog</a>
          <a href={SITE}>Home</a>
          <a href={DISCORD_INVITE} target="_blank" rel="noopener">Discord</a>
          <a href="https://status.infected.wtf">Status</a>
        </div>
      </footer>
    </div>
  );
}
