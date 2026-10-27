"use client";

import { useEffect, useRef, useState } from "react";
import { profileFontFamily, googleFontsHref } from "@/lib/profile-fonts";
import {
  Avatar, Badges, BelowFold, BestFriend, Bio, DisplayName, Footer, MetaRow, OwnerEdit, Skills, SocialLink, Widgets,
  hasWidgets, linkHost, metaItems, platformIcon, platformLabel, type LayoutProps,
} from "./parts";

export type CardLayout = "split" | "dock" | "deck" | "orbit" | "terminal" | "scrapbook" | "hexgrid" | "vinyl" | "constellation";

/** Small deterministic PRNG so decorative positions are stable per profile (and identical on server and client). */
function seeded(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Shell shared by every layout: profile font, owner edit button, the stage, then projects + comments. */
export default function ProfileLayout({ layout, ...props }: LayoutProps & { layout: CardLayout }) {
  const { p, entered } = props;
  const fontFamily = profileFontFamily(p.profileFont);
  const fontHref = googleFontsHref([p.profileFont]);
  const Stage = STAGES[layout];
  return (
    <div className={`pl pl--${layout}${entered ? " is-entered" : ""}`} style={fontFamily ? { fontFamily } : undefined}>
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      <OwnerEdit p={p} />
      <div className="pl-wrap">
        <Stage {...props} />
      </div>
      <BelowFold p={p} entered={entered} />
    </div>
  );
}

/* ── Split: identity column + about/links column ─────────────────────────── */

function Split({ p, entered, ...votes }: LayoutProps) {
  return (
    <div className="pl-split pl-panel">
      <aside className="pl-split-id">
        {p.banner && <div className="pl-split-banner" style={{ backgroundImage: `url(/${p.banner})` }} />}
        <Avatar p={p} />
        <DisplayName p={p} entered={entered} />
        <Badges p={p} />
        <MetaRow p={p} />
        <BestFriend p={p} />
        <Footer p={p} {...votes} />
      </aside>
      <section className="pl-split-main">
        {p.bio && (
          <>
            <div className="pl-kicker">About</div>
            <Bio p={p} entered={entered} />
          </>
        )}
        {p.socialLinks.length > 0 && (
          <>
            <div className="pl-kicker">Links</div>
            <div className="pl-linklist">
              {p.socialLinks.map((l) => (
                <SocialLink key={l.id} link={l} className="pl-linkrow">
                  <span className="pl-linkrow-icon">{platformIcon(l.platform)}</span>
                  <span className="pl-linkrow-text"><b>{platformLabel(l.platform)}</b><span>{linkHost(l.url)}</span></span>
                  <span className="pl-linkrow-go" aria-hidden="true">↗</span>
                </SocialLink>
              ))}
            </div>
          </>
        )}
        {hasWidgets(p) && <div className="pl-kicker">Widgets</div>}
        <Widgets p={p} />
        {p.skills.length > 0 && <div className="pl-kicker">Skills</div>}
        <Skills p={p} />
      </section>
    </div>
  );
}

/* ── Dock: centred card, links in a magnifying dock pinned to the bottom ── */

function Dock({ p, entered, ...votes }: LayoutProps) {
  return (
    <>
      <div className="pl-dock-card pl-panel">
        {p.banner && <div className="profile-banner-img fade-in" style={{ backgroundImage: `url(/${p.banner})` }} />}
        <Avatar p={p} withBanner={!!p.banner} />
        <DisplayName p={p} entered={entered} />
        <Badges p={p} />
        <Bio p={p} entered={entered} />
        <MetaRow p={p} />
        <BestFriend p={p} />
        <Widgets p={p} />
        <Skills p={p} />
        <Footer p={p} {...votes} />
      </div>
      {p.socialLinks.length > 0 && (
        <nav className="pl-dock" aria-label="Links">
          {p.socialLinks.map((l) => (
            <SocialLink key={l.id} link={l} className="pl-dock-item">
              {platformIcon(l.platform)}
              <span className="pl-dock-tip">{platformLabel(l.platform)}</span>
            </SocialLink>
          ))}
        </nav>
      )}
    </>
  );
}

/* ── Deck: sections as a stack of cards you flip through ────────────────── */

function Deck({ p, entered, ...votes }: LayoutProps) {
  const cards: { key: string; title: string; body: React.ReactNode }[] = [
    {
      key: "id", title: "Profile", body: (
        <>
          <Avatar p={p} />
          <DisplayName p={p} entered={entered} />
          <Badges p={p} />
          <Bio p={p} entered={entered} />
          <MetaRow p={p} />
        </>
      ),
    },
    ...(p.socialLinks.length ? [{
      key: "links", title: "Links", body: (
        <div className="pl-linklist">
          {p.socialLinks.map((l) => (
            <SocialLink key={l.id} link={l} className="pl-linkrow">
              <span className="pl-linkrow-icon">{platformIcon(l.platform)}</span>
              <span className="pl-linkrow-text"><b>{platformLabel(l.platform)}</b><span>{linkHost(l.url)}</span></span>
              <span className="pl-linkrow-go" aria-hidden="true">↗</span>
            </SocialLink>
          ))}
        </div>
      ),
    }] : []),
    ...(hasWidgets(p) ? [{ key: "widgets", title: "Widgets", body: <Widgets p={p} /> }] : []),
    ...(p.skills.length || p.bestFriend ? [{ key: "more", title: "More", body: <><BestFriend p={p} /><Skills p={p} /></> }] : []),
  ];
  const [index, setIndex] = useState(0);
  const drag = useRef<number | null>(null);
  const go = (d: number) => setIndex((i) => (i + d + cards.length) % cards.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % cards.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + cards.length) % cards.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cards.length]);

  return (
    <div className="pl-deck">
      <div
        className="pl-deck-stack"
        onPointerDown={(e) => { drag.current = e.clientX; }}
        onPointerUp={(e) => {
          if (drag.current === null) return;
          const dx = e.clientX - drag.current;
          drag.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
      >
        {cards.map((c, i) => {
          const depth = (i - index + cards.length) % cards.length;
          return (
            <section
              key={c.key}
              className={`pl-deck-card pl-panel${depth === 0 ? " is-front" : ""}`}
              style={{ ["--depth" as string]: depth, zIndex: cards.length - depth }}
              aria-hidden={depth !== 0}
              onClick={depth === 0 ? undefined : () => setIndex(i)}
            >
              <header className="pl-deck-head"><span>{String(i + 1).padStart(2, "0")}</span>{c.title}</header>
              <div className="pl-deck-body">{c.body}</div>
            </section>
          );
        })}
      </div>
      {cards.length > 1 && (
        <div className="pl-deck-nav">
          <button type="button" onClick={() => go(-1)} aria-label="Previous card">←</button>
          {cards.map((c, i) => (
            <button key={c.key} type="button" className={`pl-deck-dot${i === index ? " is-active" : ""}`} onClick={() => setIndex(i)} aria-label={c.title} />
          ))}
          <button type="button" onClick={() => go(1)} aria-label="Next card">→</button>
        </div>
      )}
      <Footer p={p} {...votes} className="pl-deck-footer" />
    </div>
  );
}

/* ── Orbit: links circle the avatar ─────────────────────────────────────── */

function Orbit({ p, entered, ...votes }: LayoutProps) {
  const links = p.socialLinks;
  const rand = seeded(p.username);
  const dust = Array.from({ length: 6 }, (_, i) => ({ a: (i / 6) * 360 + rand() * 40, r: 0.78 + rand() * 0.3, s: 4 + rand() * 5 }));
  return (
    <div className="pl-orbit">
      <div className="pl-orbit-stage">
        <div className="pl-orbit-ring" />
        <div className="pl-orbit-ring pl-orbit-ring--outer" />
        <div className="pl-orbit-spin">
          {dust.map((d, i) => (
            <span key={i} className="pl-orbit-dust" style={{ ["--a" as string]: `${d.a}deg`, ["--r" as string]: d.r, width: d.s, height: d.s }} />
          ))}
          {links.map((l, i) => (
            <SocialLink key={l.id} link={l} className="pl-orbit-planet" style={{ ["--a" as string]: `${(i / links.length) * 360 - 90}deg` }}>
              <span className="pl-orbit-planet-inner">{platformIcon(l.platform)}</span>
            </SocialLink>
          ))}
        </div>
        <div className="pl-orbit-core"><Avatar p={p} /></div>
      </div>
      <DisplayName p={p} entered={entered} />
      <Badges p={p} />
      <Bio p={p} entered={entered} />
      <MetaRow p={p} />
      <BestFriend p={p} />
      <Widgets p={p} />
      <Skills p={p} />
      <Footer p={p} {...votes} />
    </div>
  );
}

/* ── Terminal: the profile as a shell session ───────────────────────────── */

function Terminal({ p, entered, ...votes }: LayoutProps) {
  const user = p.username.toLowerCase();
  const prompt = (cmd: string) => (
    <div className="pl-term-cmd"><span className="pl-term-ps1">{user}@infected</span>:<span className="pl-term-path">~</span>$ {cmd}</div>
  );
  const facts = [
    ...metaItems(p).map((m) => [m.label.toLowerCase(), m.text]),
    ["views", p.views.toLocaleString()],
    ["joined", p.createdAt],
  ];
  let step = 0;
  const line = (children: React.ReactNode, key: string) => (
    <div key={key} className="pl-term-step" style={{ ["--i" as string]: step++ }}>{children}</div>
  );
  return (
    <div className="pl-term">
      <div className="pl-term-win">
        <div className="pl-term-bar">
          <i /><i /><i />
          <span>{user}@infected.wtf — zsh</span>
        </div>
        <div className="pl-term-body">
          {line(<>{prompt("whoami")}<DisplayName p={p} entered={entered} className="pl-term-name" /><Badges p={p} /></>, "who")}
          {p.bio && line(<>{prompt("cat bio.txt")}<Bio p={p} entered={entered} className="pl-term-out" /></>, "bio")}
          {line(
            <>
              {prompt("neofetch")}
              <div className="pl-term-fetch">
                <Avatar p={p} />
                <dl>
                  {facts.map(([k, v]) => (
                    <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                  ))}
                </dl>
              </div>
            </>, "fetch")}
          {p.socialLinks.length > 0 && line(
            <>
              {prompt("ls ~/links")}
              <div className="pl-term-ls">
                {p.socialLinks.map((l) => (
                  <SocialLink key={l.id} link={l} className="pl-term-link">
                    <span className="pl-term-link-icon">{platformIcon(l.platform)}</span>
                    {l.platform}<span className="pl-term-arrow"> → </span><span className="pl-term-host">{linkHost(l.url)}</span>
                  </SocialLink>
                ))}
              </div>
            </>, "ls")}
          {hasWidgets(p) && line(<>{prompt("./widgets --live")}<Widgets p={p} /></>, "widgets")}
          {p.skills.length > 0 && line(<>{prompt("skills --list")}<Skills p={p} /></>, "skills")}
          {p.bestFriend && line(<>{prompt("cat best_friend")}<BestFriend p={p} /></>, "bf")}
          {line(<div className="pl-term-cmd"><span className="pl-term-ps1">{user}@infected</span>:<span className="pl-term-path">~</span>$ <span className="pl-term-caret" /></div>, "caret")}
        </div>
      </div>
      <Footer p={p} {...votes} />
    </div>
  );
}

/* ── Scrapbook: polaroid, sticky note and paper tags ────────────────────── */

const SCRAP_FONT = "https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap";

function Scrapbook({ p, entered, ...votes }: LayoutProps) {
  const rand = seeded(p.username + "scrap");
  const tilt = () => `${(rand() * 8 - 4).toFixed(1)}deg`;
  const meta = metaItems(p);
  return (
    <div className="pl-scrap">
      <link rel="stylesheet" href={SCRAP_FONT} />
      <div className="pl-scrap-top">
        <figure className="pl-scrap-polaroid" style={{ ["--tilt" as string]: "-4deg" }}>
          <span className="pl-scrap-tape pl-scrap-tape--l" /><span className="pl-scrap-tape pl-scrap-tape--r" />
          <Avatar p={p} />
          <figcaption><DisplayName p={p} entered={entered} /></figcaption>
        </figure>
        <div className="pl-scrap-side">
          {p.bio && (
            <div className="pl-scrap-note" style={{ ["--tilt" as string]: "2.5deg" }}>
              <span className="pl-scrap-pin" />
              <Bio p={p} entered={entered} />
            </div>
          )}
          {meta.length > 0 && (
            <div className="pl-scrap-stamps">
              {meta.map((m) => <span key={m.key} className="pl-scrap-stamp" style={{ ["--tilt" as string]: tilt() }}>{m.text}</span>)}
            </div>
          )}
          <Badges p={p} />
        </div>
      </div>
      {p.socialLinks.length > 0 && (
        <div className="pl-scrap-tags">
          {p.socialLinks.map((l) => (
            <SocialLink key={l.id} link={l} className="pl-scrap-tag" style={{ ["--tilt" as string]: tilt() }}>
              {platformIcon(l.platform)}<span>{platformLabel(l.platform)}</span>
            </SocialLink>
          ))}
        </div>
      )}
      {(hasWidgets(p) || p.skills.length > 0 || p.bestFriend) && (
        <div className="pl-scrap-board pl-panel">
          <span className="pl-scrap-pin" />
          <BestFriend p={p} />
          <Widgets p={p} />
          <Skills p={p} />
        </div>
      )}
      <Footer p={p} {...votes} />
    </div>
  );
}

/* ── Hex Grid: hexagonal avatar ringed by hexagonal links ───────────────── */

// Axial offsets (in hex units) of the six neighbours, then a second ring for overflow.
const HEX_SLOTS: [number, number][] = [
  [0, -1], [0.866, -0.5], [0.866, 0.5], [0, 1], [-0.866, 0.5], [-0.866, -0.5],
  [0, -2], [0.866, -1.5], [1.732, -1], [1.732, 0], [1.732, 1], [0.866, 1.5], [0, 2], [-0.866, 1.5], [-1.732, 1], [-1.732, 0], [-1.732, -1], [-0.866, -1.5],
];

function HexGrid({ p, entered, ...votes }: LayoutProps) {
  const links = p.socialLinks.slice(0, HEX_SLOTS.length);
  const ringSize = links.length > 6 ? HEX_SLOTS.length : 6;
  return (
    <div className="pl-hex">
      <div className={`pl-hex-hive${ringSize > 6 ? " is-wide" : ""}`}>
        {HEX_SLOTS.slice(0, ringSize).map(([x, y], i) => {
          const link = links[i];
          const style = { ["--x" as string]: x, ["--y" as string]: y, ["--i" as string]: i };
          return link ? (
            <SocialLink key={link.id} link={link} className="pl-hex-cell pl-hex-cell--link" style={style}>
              {platformIcon(link.platform)}
            </SocialLink>
          ) : (
            <span key={`empty-${i}`} className="pl-hex-cell" style={style} aria-hidden="true" />
          );
        })}
        <div className="pl-hex-core"><Avatar p={p} /></div>
      </div>
      <div className="pl-hex-plate pl-panel">
        <DisplayName p={p} entered={entered} />
        <Badges p={p} />
        <Bio p={p} entered={entered} />
        <MetaRow p={p} />
        <BestFriend p={p} />
      </div>
      <Widgets p={p} />
      <Skills p={p} />
      <Footer p={p} {...votes} />
    </div>
  );
}

/* ── Vinyl: the avatar is the record label, links are the tracklist ────── */

function Vinyl({ p, entered, ...votes }: LayoutProps) {
  const side = (i: number) => `${i < 6 ? "A" : "B"}${(i % 6) + 1}`;
  return (
    <div className="pl-vinyl pl-panel">
      <div className="pl-vinyl-deck">
        <div className="pl-vinyl-record">
          <div className="pl-vinyl-grooves" />
          <div className="pl-vinyl-label"><Avatar p={p} /></div>
          <span className="pl-vinyl-hole" />
        </div>
        <svg className="pl-vinyl-arm" viewBox="0 0 120 220" aria-hidden="true">
          <circle cx="96" cy="22" r="16" />
          <path d="M96 22 L96 120 L60 196" />
          <rect x="46" y="190" width="24" height="16" rx="3" transform="rotate(25 58 198)" />
        </svg>
      </div>
      <div className="pl-vinyl-notes">
        <div className="pl-kicker">Side A · infected.wtf/{p.username}</div>
        <DisplayName p={p} entered={entered} />
        <Badges p={p} />
        {p.musicTrackTitle && (
          <div className="pl-vinyl-now">Now spinning — <b>{p.musicTrackTitle}</b>{p.musicTrackArtist ? ` · ${p.musicTrackArtist}` : ""}</div>
        )}
        <Bio p={p} entered={entered} />
        <MetaRow p={p} />
        {p.socialLinks.length > 0 && (
          <ol className="pl-vinyl-tracks">
            {p.socialLinks.map((l, i) => (
              <li key={l.id}>
                <SocialLink link={l} className="pl-vinyl-track">
                  <span className="pl-vinyl-track-n">{side(i)}</span>
                  <span className="pl-vinyl-track-icon">{platformIcon(l.platform)}</span>
                  <span className="pl-vinyl-track-name">{platformLabel(l.platform)}</span>
                  <span className="pl-vinyl-track-dots" />
                  <span className="pl-vinyl-track-host">{linkHost(l.url)}</span>
                </SocialLink>
              </li>
            ))}
          </ol>
        )}
        <BestFriend p={p} />
      </div>
      <div className="pl-vinyl-extra">
        <Widgets p={p} />
        <Skills p={p} />
        <Footer p={p} {...votes} />
      </div>
    </div>
  );
}

/* ── Constellation: links are stars joined into a constellation ─────────── */

function Constellation({ p, entered, ...votes }: LayoutProps) {
  const rand = seeded(p.username + "stars");
  const links = p.socialLinks;
  // Spread the link stars around the avatar on a jittered ellipse, so every profile gets its own shape.
  const stars = links.map((l, i) => {
    const a = (i / Math.max(links.length, 1)) * Math.PI * 2 - Math.PI / 2 + (rand() - 0.5) * 0.5;
    const r = 0.62 + rand() * 0.3;
    return { link: l, x: 50 + Math.cos(a) * r * 46, y: 50 + Math.sin(a) * r * 44 };
  });
  const sky = Array.from({ length: 70 }, () => ({ x: rand() * 100, y: rand() * 100, s: 1 + rand() * 2, d: rand() * 4 }));
  const path = stars.length > 1 ? stars.map((s, i) => `${i ? "L" : "M"}${s.x} ${s.y}`).join(" ") + " Z" : "";
  return (
    <div className="pl-const">
      <div className="pl-const-sky">
        {sky.map((s, i) => (
          <span key={i} className="pl-const-twinkle" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
        ))}
        <svg className="pl-const-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {path && <path d={path} />}
          {stars.map((s, i) => <line key={i} x1="50" y1="50" x2={s.x} y2={s.y} className="pl-const-spoke" />)}
        </svg>
        {stars.map((s) => (
          <SocialLink key={s.link.id} link={s.link} className="pl-const-star" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
            <span className="pl-const-star-dot">{platformIcon(s.link.platform)}</span>
            <span className="pl-const-star-name">{platformLabel(s.link.platform)}</span>
          </SocialLink>
        ))}
        <div className="pl-const-core"><Avatar p={p} /></div>
      </div>
      <DisplayName p={p} entered={entered} />
      <Badges p={p} />
      <Bio p={p} entered={entered} />
      <MetaRow p={p} />
      <BestFriend p={p} />
      <Widgets p={p} />
      <Skills p={p} />
      <Footer p={p} {...votes} />
    </div>
  );
}

const STAGES: Record<CardLayout, (props: LayoutProps) => React.ReactNode> = {
  split: Split,
  dock: Dock,
  deck: Deck,
  orbit: Orbit,
  terminal: Terminal,
  scrapbook: Scrapbook,
  hexgrid: HexGrid,
  vinyl: Vinyl,
  constellation: Constellation,
};
