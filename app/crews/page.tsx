import Link from "next/link";
import type { Metadata } from "next";
import PublicNavbar from "@/components/PublicNavbar";
import SiteFooter from "@/components/SiteFooter";
import CookieBanner from "@/components/CookieBanner";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCookieConsent } from "@/lib/cookie-consent";
import { CREW_EMBLEMS, crewViews } from "@/lib/crews";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Crews | INFECTED.WTF", description: "The top crews on infected.wtf, ranked by their members' total views." };

export default async function CrewsPage() {
  const session = await getSession();
  const viewer = session ? await prisma.user.findUnique({ where: { id: session.userId }, select: { username: true } }) : null;
  const consent = await getCookieConsent();
  const crews = await prisma.crew.findMany({ include: { _count: { select: { members: true } } } });
  const totals = await crewViews(crews.map((c) => c.id));
  const ranked = crews.map((c) => ({ ...c, views: totals.get(c.id) ?? 0 })).sort((a, b) => b.views - a.views).slice(0, 100);

  return (
    <>
      <PublicNavbar user={viewer} />
      <div className="crew-page fade-in">
        <div className="support-header">
          <div className="support-badge">Crews</div>
          <h1 className="support-title">Top crews</h1>
          <p className="support-sub">Squads ranked by their members&apos; total views. Start one or get invited from your dashboard.</p>
          <Link href="/dashboard?page=crew" className="int-btn int-btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>Create or manage your crew</Link>
        </div>
        {ranked.length === 0 ? (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,.5)" }}>No crews yet — be the first.</p>
        ) : (
          <ol className="crew-board">
            {ranked.map((c, i) => (
              <li key={c.id}>
                <Link href={`/c/${c.tag}`} className="crew-row" style={{ ["--crew" as string]: c.color }}>
                  <span className="crew-row-rank">#{i + 1}</span>
                  <span className="crew-row-emblem"><svg viewBox="0 0 24 24" fill="currentColor"><path d={CREW_EMBLEMS[c.emblem] || CREW_EMBLEMS.biohazard} /></svg></span>
                  <span className="crew-row-name"><span className="nt-crew">{c.tag}</span> {c.name}</span>
                  <span className="crew-row-meta">{c._count.members} members · {c.views.toLocaleString("en-US")} views</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
      <SiteFooter />
      <CookieBanner initialConsent={consent} />
    </>
  );
}
