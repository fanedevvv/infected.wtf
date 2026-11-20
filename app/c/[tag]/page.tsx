import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PublicNavbar from "@/components/PublicNavbar";
import SiteFooter from "@/components/SiteFooter";
import CookieBanner from "@/components/CookieBanner";
import NameTag from "@/components/NameTag";
import CrewStaffDisband from "./CrewStaffDisband";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCookieConsent } from "@/lib/cookie-consent";
import { CREW_EMBLEMS, crewViews } from "@/lib/crews";
import { nameDecorFor } from "@/lib/name-decor";

export const dynamic = "force-dynamic";

async function loadCrew(tag: string) {
  return prisma.crew.findUnique({
    where: { tag: tag.toUpperCase() },
    include: { members: { orderBy: { joinedAt: "asc" }, include: { user: { select: { id: true, username: true, banned: true, profiles: { where: { isPrimary: true }, take: 1, select: { slug: true, displayName: true, avatar: true, views: true } } } } } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const crew = await loadCrew((await params).tag);
  if (!crew) return {};
  return { title: `[${crew.tag}] ${crew.name} | INFECTED.WTF`, description: crew.description || `${crew.name} — a crew on infected.wtf with ${crew.members.length} members.` };
}

export default async function CrewPage({ params }: { params: Promise<{ tag: string }> }) {
  const crew = await loadCrew((await params).tag);
  if (!crew) notFound();
  const session = await getSession();
  const viewer = session ? await prisma.user.findUnique({ where: { id: session.userId }, select: { username: true, isMod: true, isAdmin: true, isOwner: true } }) : null;
  const consent = await getCookieConsent();

  const members = crew.members.filter((m) => !m.user.banned).map((m) => ({
    userId: m.user.id, role: m.role, slug: m.user.profiles[0]?.slug ?? m.user.username,
    name: m.user.profiles[0]?.displayName || m.user.username, avatar: m.user.profiles[0]?.avatar ?? null, views: m.user.profiles[0]?.views ?? 0,
  })).sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : a.role === "officer" && b.role !== "officer" ? -1 : b.role === "officer" && a.role !== "officer" ? 1 : b.views - a.views));
  const total = (await crewViews([crew.id])).get(crew.id) ?? 0;
  const allCrews = await prisma.crew.findMany({ select: { id: true } });
  const totals = await crewViews(allCrews.map((c) => c.id));
  const rank = [...totals.entries()].sort((a, b) => b[1] - a[1]).findIndex(([id]) => id === crew.id) + 1;
  const decor = await nameDecorFor(members.map((m) => m.userId));
  const isStaff = !!(viewer && (viewer.isMod || viewer.isAdmin || viewer.isOwner));

  return (
    <>
      <PublicNavbar user={viewer ? { username: viewer.username } : null} />
      <div className="crew-page fade-in" style={{ ["--crew" as string]: crew.color }}>
        <Link href="/crews" className="legal-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><polyline points="15 18 9 12 15 6" /></svg>
          All crews
        </Link>

        <header className="crew-hero">
          <div className="crew-emblem"><svg viewBox="0 0 24 24" fill="currentColor"><path d={CREW_EMBLEMS[crew.emblem] || CREW_EMBLEMS.biohazard} /></svg></div>
          <div className="crew-hero-text">
            <span className="nt-crew crew-hero-tag">{crew.tag}</span>
            <h1>{crew.name}</h1>
            {crew.description && <p>{crew.description}</p>}
          </div>
          <dl className="crew-stats">
            <div><dt>Rank</dt><dd>#{rank}</dd></div>
            <div><dt>Members</dt><dd>{members.length}</dd></div>
            <div><dt>Total views</dt><dd>{total.toLocaleString("en-US")}</dd></div>
          </dl>
        </header>

        <section className="crew-members">
          {members.map((m) => (
            <Link key={m.userId} href={`/${m.slug}`} className="crew-member">
              {/* eslint-disable-next-line @next/next/no-img-element -- user upload */}
              <img src={m.avatar ? `/${m.avatar}` : "/assets/img/default-avatar.png"} alt="" />
              <div className="crew-member-text">
                <NameTag name={m.name} nameplate={decor.get(m.userId)?.nameplate} />
                <span>@{m.slug} · {m.views.toLocaleString("en-US")} views</span>
              </div>
              {m.role !== "member" && <span className={`crew-role crew-role--${m.role}`}>{m.role}</span>}
            </Link>
          ))}
        </section>

        {isStaff && <CrewStaffDisband tag={crew.tag} />}
      </div>
      <SiteFooter />
      <CookieBanner initialConsent={consent} />
    </>
  );
}
