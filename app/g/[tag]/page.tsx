import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PublicNavbar from "@/components/PublicNavbar";
import SiteFooter from "@/components/SiteFooter";
import CookieBanner from "@/components/CookieBanner";
import NameTag from "@/components/NameTag";
import GroupActions from "./GroupActions";
import GroupStaffDisband from "./GroupStaffDisband";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCookieConsent } from "@/lib/cookie-consent";
import { BOOST_COST, BOOST_COST_PLUS, CREW_EMBLEMS, GROUP_LEVELS, activeBoosts, canUseStrip, crewViews, levelFor, parseGroupLinks } from "@/lib/crews";
import { nameDecorFor } from "@/lib/name-decor";

export const dynamic = "force-dynamic";

const POLICY_LABEL = { open: "Open to all", request: "Ask to join", invite: "Invite only" } as const;
const fmt = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : n.toLocaleString("en-US"));

async function loadGroup(tag: string) {
  return prisma.crew.findUnique({
    where: { tag: tag.toUpperCase() },
    include: { members: { orderBy: { joinedAt: "asc" }, include: { user: { select: { id: true, username: true, banned: true, profiles: { where: { isPrimary: true }, take: 1, select: { slug: true, displayName: true, avatar: true, views: true } } } } } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const g = await loadGroup((await params).tag);
  if (!g) return {};
  const description = g.description || `${g.name} — a group on infected.wtf with ${g.members.length} members.`;
  return { title: `${g.name} [${g.tag}] | INFECTED.WTF`, description, openGraph: { title: `${g.name} · infected.wtf`, description, images: g.banner ? [`/${g.banner}`] : g.icon ? [`/${g.icon}`] : undefined } };
}

export default async function GroupPage({ params }: { params: Promise<{ tag: string }> }) {
  const g = await loadGroup((await params).tag);
  if (!g) notFound();
  const session = await getSession();
  const viewer = session ? await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, username: true, isMod: true, isAdmin: true, isOwner: true, isPremium: true, premiumExpiresAt: true } }) : null;
  const consent = await getCookieConsent();

  const members = g.members.filter((m) => !m.user.banned).map((m) => ({
    userId: m.user.id, role: m.role, slug: m.user.profiles[0]?.slug ?? m.user.username,
    name: m.user.profiles[0]?.displayName || m.user.username, avatar: m.user.profiles[0]?.avatar ?? null, views: m.user.profiles[0]?.views ?? 0,
  })).sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : a.role === "officer" && b.role !== "officer" ? -1 : b.role === "officer" && a.role !== "officer" ? 1 : b.views - a.views));
  const owner = members.find((m) => m.role === "owner");
  const [views, boostsMap, decor] = await Promise.all([crewViews([g.id]), activeBoosts([g.id]), nameDecorFor(members.map((m) => m.userId))]);
  const boosts = boostsMap.get(g.id) ?? 0;
  const level = levelFor(boosts);
  const next = GROUP_LEVELS.find((l) => l.boosts > boosts);
  const links = parseGroupLinks(g.links);
  const strip = canUseStrip(boosts) ? g.strip : null;

  let state: "member" | "manager" | "requested" | "other-group" | "none" = "none";
  let myBoostUntil: string | null = null;
  if (viewer) {
    const mine = await prisma.crewMember.findUnique({ where: { userId: viewer.id }, select: { crewId: true, role: true } });
    if (mine?.crewId === g.id) state = mine.role === "member" ? "member" : "manager";
    else if (mine) state = "other-group";
    else if (await prisma.crewRequest.findUnique({ where: { crewId_userId: { crewId: g.id, userId: viewer.id } } })) state = "requested";
    const b = await prisma.crewBoost.findFirst({ where: { crewId: g.id, userId: viewer.id, expiresAt: { gt: new Date() } }, select: { expiresAt: true } });
    myBoostUntil = b?.expiresAt.toISOString() ?? null;
  }
  const viewerPlus = !!viewer?.isPremium && (!viewer.premiumExpiresAt || viewer.premiumExpiresAt > new Date());
  const isStaff = !!(viewer && (viewer.isMod || viewer.isAdmin || viewer.isOwner));
  const emblem = <svg viewBox="0 0 24 24" fill="currentColor"><path d={CREW_EMBLEMS[g.emblem] || CREW_EMBLEMS.biohazard} /></svg>;

  return (
    <>
      <PublicNavbar user={viewer ? { username: viewer.username } : null} />
      <div className="gp fade-in" style={{ ["--crew" as string]: g.color }}>
        <nav className="gp-crumbs"><Link href="/">infected.wtf</Link><span>›</span><Link href="/groups">Groups</Link><span>›</span><b>{g.name}</b></nav>

        <article className="gp-card">
          <div className="gp-banner" style={g.banner ? { backgroundImage: `url(/${g.banner})` } : undefined}>
            {!g.banner && <span className="gp-banner-mark" aria-hidden="true">{emblem}</span>}
            {strip && (
              <div className="gp-strip-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element -- group upload */}
                <img className="gp-strip" src={`/${strip}`} alt={`${g.name} strip`} />
                <small>350 × 19 · infected.wtf/g/{g.tag}</small>
              </div>
            )}
          </div>

          <div className="gp-head">
            <div className="gp-id">
              {/* eslint-disable-next-line @next/next/no-img-element -- group upload */}
              {g.icon ? <img className="gp-icon" src={`/${g.icon}`} alt="" /> : <span className="gp-icon gp-icon--emblem">{emblem}</span>}
              <div className="gp-title">
                <h1>{g.name}</h1>
                <span className="nt-crew">{g.tag}</span>
              </div>
            </div>
            <p className="gp-policy">
              {POLICY_LABEL[g.joinPolicy as keyof typeof POLICY_LABEL] ?? "Ask to join"}
              {owner && <> · led by <Link href={`/${owner.slug}`}><NameTag name={owner.name} nameplate={decor.get(owner.userId)?.nameplate} /></Link></>}
            </p>
            <span className={`gp-level gp-level--${level.level}`} title={next ? `${next.boosts - boosts} more boost${next.boosts - boosts === 1 ? "" : "s"} to level ${next.level}` : "Max level"}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M6 3h12l4 6-10 12L2 9z" /></svg>
              Level {level.level} · {boosts}
            </span>
            <GroupActions
              tag={g.tag} name={g.name} loggedIn={!!viewer} state={state}
              joinPolicy={(["open", "request", "invite"].includes(g.joinPolicy) ? g.joinPolicy : "request") as "open" | "request" | "invite"}
              boostCost={viewerPlus ? BOOST_COST_PLUS : BOOST_COST} myBoostUntil={myBoostUntil}
            />
          </div>

          <dl className="gp-stats">
            <div><dt>Members</dt><dd>{members.length}</dd></div>
            <div><dt>Boosts</dt><dd>{boosts}</dd></div>
            <div><dt>Profile views</dt><dd>{fmt(views.get(g.id) ?? 0)}</dd></div>
            <div><dt>Founded</dt><dd>{g.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</dd></div>
          </dl>
        </article>

        <section className="gp-section">
          <h2>About</h2>
          <p className={g.description ? "" : "gp-empty"}>{g.description || "Nothing here yet."}</p>
        </section>

        <section className="gp-section">
          <h2>Links <span>{links.length}</span></h2>
          {links.length ? (
            <div className="gp-links">
              {links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer nofollow">{l.label || l.url.replace(/^https?:\/\/(www\.)?/, "")} ↗</a>
              ))}
            </div>
          ) : <p className="gp-empty">No links yet.</p>}
        </section>

        <section className="gp-section">
          <h2>Members <span>{members.length}</span></h2>
          <div className="gp-members">
            {members.map((m) => (
              <Link key={m.userId} href={`/${m.slug}`} className="gp-member">
                {/* eslint-disable-next-line @next/next/no-img-element -- user upload */}
                <img src={m.avatar ? `/${m.avatar}` : "/assets/img/default-avatar.png"} alt="" />
                <NameTag name={m.name} nameplate={decor.get(m.userId)?.nameplate} />
                <small>{m.role === "owner" ? "👑 leader" : m.role === "officer" ? "officer" : `${fmt(m.views)} views`}</small>
              </Link>
            ))}
          </div>
        </section>

        {next && (
          <section className="gp-section gp-perks">
            <h2>Boost perks</h2>
            <ul>
              {GROUP_LEVELS.filter((l) => l.level > 0).map((l) => (
                <li key={l.level} className={level.level >= l.level ? "is-on" : ""}>
                  <b>Level {l.level}</b> <span>{l.boosts} boosts</span> — {l.perks.join(", ")}
                </li>
              ))}
            </ul>
          </section>
        )}

        {isStaff && <GroupStaffDisband tag={g.tag} />}
      </div>
      <SiteFooter />
      <CookieBanner initialConsent={consent} />
    </>
  );
}
