import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import LabNav from "@/components/lab/LabNav";
import LeaderboardTabs from "./LeaderboardTabs";
import SafeImg from "@/components/SafeImg";
import CookieBanner from "@/components/CookieBanner";
import LabFooter from "@/components/lab/LabFooter";
import { getCookieConsent } from "@/lib/cookie-consent";

function isPremiumNow(isPremium: boolean, premiumExpiresAt: Date | null): boolean {
  return isPremium && (!premiumExpiresAt || premiumExpiresAt.getTime() > Date.now());
}

async function detectCountry(h: Awaited<ReturnType<typeof headers>>): Promise<{ code: string; name: string }> {
  const cfCode = h.get("cf-ipcountry");
  if (cfCode && cfCode.length === 2) {
    return { code: cfCode.toUpperCase(), name: "" };
  }
  const ip =
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    "";
  if (!ip || ip === "127.0.0.1" || ip === "::1") return { code: "", name: "" };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode,country`, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timeout);
    const data = await res.json();
    return { code: data.countryCode || "", name: data.country || "" };
  } catch {
    return { code: "", name: "" };
  }
}

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const searchQuery = (params.q || "").trim();

  const session = await getSession();
  const loggedIn = !!session;
  const myUserId = session?.userId ?? 0;

  const h = await headers();

  let myRegionCode = "";
  let myRegionName = "";
  let myProfileExists = false;
  let currentUser: { username: string } | null = null;
  if (loggedIn) {
    const me = await prisma.user.findUnique({
      where: { id: myUserId },
      select: { username: true, leaderboardRegionCode: true, leaderboardRegionName: true, profiles: { where: { isPrimary: true }, take: 1, select: { id: true } } },
    });
    if (me) {
      currentUser = { username: me.username };
      myRegionCode = me.leaderboardRegionCode || "";
      myRegionName = me.leaderboardRegionName || "";
      myProfileExists = me.profiles.length > 0;
    }
  }

  const { code: detectedCountryCode, name: detectedCountry } = await detectCountry(h);
  const badgeRegionName = myRegionName && myRegionCode !== "XX" ? myRegionName : detectedCountry;

  const topProfilesRaw = await prisma.profile.findMany({
    where: { isPrimary: true, user: { banned: false, emailVerified: true } },
    orderBy: { views: "desc" },
    take: 100,
    select: {
      userId: true,
      slug: true,
      displayName: true,
      avatar: true,
      views: true,
      user: { select: { isPremium: true, premiumExpiresAt: true } },
    },
  });
  const topUsers = topProfilesRaw.map((p) => ({
    id: p.userId,
    username: p.slug,
    displayName: p.displayName || "",
    avatar: p.avatar || "",
    views: p.views,
    premium: isPremiumNow(p.user.isPremium, p.user.premiumExpiresAt),
  }));

  let localProfilesRaw;
  if (detectedCountryCode && detectedCountryCode !== "XX") {
    localProfilesRaw = await prisma.profile.findMany({
      where: { isPrimary: true, user: { banned: false, emailVerified: true, leaderboardRegionCode: detectedCountryCode } },
      orderBy: { localViews: "desc" },
      take: 100,
      select: {
        userId: true,
        slug: true,
        displayName: true,
        avatar: true,
        localViews: true,
        user: { select: { isPremium: true, premiumExpiresAt: true, leaderboardRegionName: true } },
      },
    });
  } else {
    localProfilesRaw = await prisma.profile.findMany({
      where: { isPrimary: true, user: { banned: false, emailVerified: true, leaderboardRegionCode: { not: null, notIn: ["", "XX"] } } },
      orderBy: { localViews: "desc" },
      take: 100,
      select: {
        userId: true,
        slug: true,
        displayName: true,
        avatar: true,
        localViews: true,
        user: { select: { isPremium: true, premiumExpiresAt: true, leaderboardRegionName: true } },
      },
    });
  }
  const localUsers = localProfilesRaw.map((p) => ({
    id: p.userId,
    username: p.slug,
    displayName: p.displayName || "",
    avatar: p.avatar || "",
    localViews: p.localViews,
    regionName: p.user.leaderboardRegionName || "",
    premium: isPremiumNow(p.user.isPremium, p.user.premiumExpiresAt),
  }));

  const likesUsersRaw = await prisma.user.findMany({
    where: { banned: false, emailVerified: true },
    orderBy: { likesReceived: { _count: "desc" } },
    take: 100,
    select: {
      id: true,
      username: true,
      isPremium: true,
      premiumExpiresAt: true,
      profiles: { where: { isPrimary: true }, take: 1, select: { displayName: true, avatar: true } },
      _count: { select: { likesReceived: true } },
    },
  });
  const likesUsers = likesUsersRaw
    .filter((u) => u._count.likesReceived > 0)
    .map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.profiles[0]?.displayName || "",
      avatar: u.profiles[0]?.avatar || "",
      likeCount: u._count.likesReceived,
      premium: isPremiumNow(u.isPremium, u.premiumExpiresAt),
    }));

  let myRankGlobal = 0;
  let myViewsGlobal = 0;
  if (loggedIn) {
    const idx = topUsers.findIndex((u) => u.id === myUserId);
    if (idx !== -1) {
      myRankGlobal = idx + 1;
      myViewsGlobal = topUsers[idx].views;
    } else {
      const myProfile = await prisma.profile.findFirst({ where: { userId: myUserId, isPrimary: true }, select: { views: true } });
      myViewsGlobal = myProfile?.views ?? 0;
      const higherCount = await prisma.profile.count({
        where: { isPrimary: true, user: { banned: false, emailVerified: true }, views: { gt: myViewsGlobal } },
      });
      myRankGlobal = higherCount + 1;
    }

    if (myRankGlobal === 1) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const already = await prisma.notification.findFirst({
        where: { userId: myUserId, type: "leaderboard_first", createdAt: { gte: todayStart } },
      });
      if (!already) {
        await prisma.notification.create({
          data: {
            userId: myUserId,
            type: "leaderboard_first",
            title: "🏆 You're #1 on the Leaderboard!",
            body: "You are currently the top profile on the global leaderboard. Keep it up!",
            icon: "trophy",
            link: "/leaderboard",
          },
        });
      }
    }
  }

  let myRankLocal = 0;
  let myViewsLocal = 0;
  if (loggedIn && myRegionCode && myRegionCode !== "XX") {
    const idx = localUsers.findIndex((u) => u.id === myUserId);
    if (idx !== -1) {
      myRankLocal = idx + 1;
      myViewsLocal = localUsers[idx].localViews;
    } else {
      const myProfile = await prisma.profile.findFirst({ where: { userId: myUserId , isPrimary: true }, select: { localViews: true } });
      myViewsLocal = myProfile?.localViews ?? 0;
      const higherCount = await prisma.profile.count({
        where: {
          isPrimary: true,
          user: { banned: false, emailVerified: true, leaderboardRegionCode: { not: null, notIn: ["", "XX"] } },
          localViews: { gt: myViewsLocal },
        },
      });
      myRankLocal = higherCount + 1;
    }
  }

  let searchResult: { username: string; displayName: string; avatar: string; views: number } | null = null;
  let searchRank = 0;
  if (searchQuery) {
    const p = await prisma.profile.findFirst({
      where: { slug: searchQuery, isPrimary: true, user: { banned: false, emailVerified: true } },
      select: { slug: true, displayName: true, avatar: true, views: true },
    });
    if (p) {
      searchResult = { username: p.slug, displayName: p.displayName || "", avatar: p.avatar || "", views: p.views };
      searchRank = (await prisma.profile.count({ where: { isPrimary: true, user: { banned: false, emailVerified: true }, views: { gt: p.views } } })) + 1;
    }
  }

  return (
    <div className="lab-page lb-lab">
      <LabNav user={currentUser} />
      <div className="lb-page">
        <header className="lb-head lab-wrap">
          <span className="lab-label"><span className="lab-dot" /> Live · Hall of fame</span>
          <h1>Most <span className="is-accent">contagious.</span></h1>
          <p>The most viewed pages on infected.wtf, updated live. Search any username to see where they stand.</p>

          <form className="lb-search-form" method="get" action="/leaderboard">
            <label className="lb-search-wrap">
              <span className="lx-claim-prompt" aria-hidden="true">&gt;</span>
              <input type="text" name="q" className="lb-search-input" placeholder="search username" defaultValue={searchQuery} autoComplete="off" spellCheck={false} />
            </label>
            {searchQuery && <a href="/leaderboard" className="lb-search-clear" aria-label="Clear search">✕</a>}
            <button type="submit" className="lab-btn lab-btn--solid">Search</button>
          </form>
        </header>

        {searchQuery && (
          <div className="lb-search-result">
            {searchResult ? (
              <div className="lb-search-found">
                <div className="lb-search-rank-badge">#{searchRank.toLocaleString()}</div>
                <SafeImg src={searchResult.avatar ? `/${searchResult.avatar}` : null} className="lb-search-avatar" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: ".95rem" }}>{searchResult.displayName || searchResult.username}</div>
                  <div className="lb-search-sub">
                    @{searchResult.username} · {searchResult.views.toLocaleString()} views
                  </div>
                </div>
                <a href={`/${encodeURIComponent(searchResult.username)}`} className="btn btn-secondary btn-sm lb-search-link" target="_blank" rel="noreferrer">↗ Profile</a>
              </div>
            ) : (
              <div className="lb-search-not-found">No user found for &quot;<strong>{searchQuery}</strong>&quot;.</div>
            )}
          </div>
        )}

        <LeaderboardTabs
          globalUsers={topUsers}
          localUsers={localUsers}
          likesUsers={likesUsers}
          searchQuery={searchQuery}
          loggedIn={loggedIn}
          myUserId={myUserId}
          myProfileExists={myProfileExists}
          myRankGlobal={myRankGlobal}
          myViewsGlobal={myViewsGlobal}
          myRegionCode={myRegionCode}
          myRegionName={myRegionName}
          myRankLocal={myRankLocal}
          myViewsLocal={myViewsLocal}
          badgeRegionName={badgeRegionName}
        />
      </div>
      <LabFooter />
      <CookieBanner initialConsent={await getCookieConsent()} />
    </div>
  );
}
