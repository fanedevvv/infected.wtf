import Link from "next/link";
import type { Metadata } from "next";
import PublicNavbar from "@/components/PublicNavbar";
import SiteFooter from "@/components/SiteFooter";
import CookieBanner from "@/components/CookieBanner";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCookieConsent } from "@/lib/cookie-consent";
import { CREW_EMBLEMS, activeBoosts, crewViews, levelFor } from "@/lib/crews";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Groups | INFECTED.WTF", description: "The top groups on infected.wtf, ranked by their members' total views." };

export default async function GroupsPage() {
  const session = await getSession();
  const viewer = session ? await prisma.user.findUnique({ where: { id: session.userId }, select: { username: true } }) : null;
  const consent = await getCookieConsent();
  const groups = await prisma.crew.findMany({ include: { _count: { select: { members: true } } } });
  const ids = groups.map((g) => g.id);
  const [views, boosts] = await Promise.all([crewViews(ids), activeBoosts(ids)]);
  const ranked = groups.map((g) => ({ ...g, views: views.get(g.id) ?? 0, boosts: boosts.get(g.id) ?? 0 })).sort((a, b) => b.views - a.views || b.boosts - a.boosts).slice(0, 100);

  return (
    <>
      <PublicNavbar user={viewer} />
      <div className="gp fade-in">
        <div className="support-header">
          <div className="support-badge">Groups</div>
          <h1 className="support-title">Top groups</h1>
          <p className="support-sub">Squads ranked by their members&apos; total views. Start one or join one — your group&apos;s tag shows next to your name everywhere.</p>
          <Link href="/dashboard?page=crew" className="gp-btn gp-btn--main" style={{ marginTop: "1rem" }}>Create or manage your group</Link>
        </div>
        {ranked.length === 0 ? (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,.5)" }}>No groups yet — be the first.</p>
        ) : (
          <ol className="crew-board">
            {ranked.map((g, i) => (
              <li key={g.id}>
                <Link href={`/g/${g.tag}`} className="crew-row" style={{ ["--crew" as string]: g.color }}>
                  <span className="crew-row-rank">#{i + 1}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element -- group upload */}
                  {g.icon ? <img className="crew-row-emblem" src={`/${g.icon}`} alt="" /> : <span className="crew-row-emblem"><svg viewBox="0 0 24 24" fill="currentColor"><path d={CREW_EMBLEMS[g.emblem] || CREW_EMBLEMS.biohazard} /></svg></span>}
                  <span className="crew-row-name">{g.name} <span className="nt-crew">{g.tag}</span></span>
                  <span className="crew-row-meta">Lv {levelFor(g.boosts).level} · {g._count.members} members · {g.views.toLocaleString("en-US")} views</span>
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
