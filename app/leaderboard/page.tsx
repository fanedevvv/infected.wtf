import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import PublicNavbar from "@/components/PublicNavbar";
import LeaderboardTabs from "./LeaderboardTabs";
import SafeImg from "@/components/SafeImg";
import CookieBanner from "@/components/CookieBanner";
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
      select: { username: true, leaderboardRegionCode: true, leaderboardRegionName: true, profile: { select: { id: true } } },
    });
    if (me) {
      currentUser = { username: me.username };
      myRegionCode = me.leaderboardRegionCode || "";
      myRegionName = me.leaderboardRegionName || "";
      myProfileExists = !!me.profile;
    }
  }

  const { code: detectedCountryCode, name: detectedCountry } = await detectCountry(h);
  const badgeRegionName = myRegionName && myRegionCode !== "XX" ? myRegionName : detectedCountry;

  const topUsersRaw = await prisma.user.findMany({
    where: { banned: false, emailVerified: true },
    orderBy: { profile: { views: "desc" } },
    take: 100,
    select: {
      id: true,
      username: true,
      isPremium: true,
      premiumExpiresAt: true,
      profile: { select: { displayName: true, avatar: true, views: true } },
    },
  });
  const topUsers = topUsersRaw
    .filter((u) => u.profile)
    .map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.profile!.displayName || "",
      avatar: u.profile!.avatar || "",
      views: u.profile!.views,
      premium: isPremiumNow(u.isPremium, u.premiumExpiresAt),
    }));

  let localUsersRaw;
  if (detectedCountryCode && detectedCountryCode !== "XX") {
    localUsersRaw = await prisma.user.findMany({
      where: { banned: false, emailVerified: true, leaderboardRegionCode: detectedCountryCode },
      orderBy: { profile: { localViews: "desc" } },
      take: 100,
      select: {
        id: true,
        username: true,
        isPremium: true,
        premiumExpiresAt: true,
        leaderboardRegionName: true,
        profile: { select: { displayName: true, avatar: true, localViews: true } },
      },
    });
  } else {
    localUsersRaw = await prisma.user.findMany({
      where: { banned: false, emailVerified: true, leaderboardRegionCode: { not: null, notIn: ["", "XX"] } },
      orderBy: { profile: { localViews: "desc" } },
      take: 100,
      select: {
        id: true,
        username: true,
        isPremium: true,
        premiumExpiresAt: true,
        leaderboardRegionName: true,
        profile: { select: { displayName: true, avatar: true, localViews: true } },
      },
    });
  }
  const localUsers = localUsersRaw
    .filter((u) => u.profile)
    .map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.profile!.displayName || "",
      avatar: u.profile!.avatar || "",
      localViews: u.profile!.localViews,
      regionName: u.leaderboardRegionName || "",
      premium: isPremiumNow(u.isPremium, u.premiumExpiresAt),
    }));

  const likesUsersRaw = await prisma.user.findMany({
    where: { banned: false, emailVerified: true, profile: { isNot: null } },
    orderBy: { likesReceived: { _count: "desc" } },
    take: 100,
    select: {
      id: true,
      username: true,
      isPremium: true,
      premiumExpiresAt: true,
      profile: { select: { displayName: true, avatar: true } },
      _count: { select: { likesReceived: true } },
    },
  });
  const likesUsers = likesUsersRaw
    .filter((u) => u._count.likesReceived > 0)
    .map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.profile!.displayName || "",
      avatar: u.profile!.avatar || "",
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
      const myProfile = await prisma.profile.findUnique({ where: { userId: myUserId }, select: { views: true } });
      myViewsGlobal = myProfile?.views ?? 0;
      const higherCount = await prisma.user.count({
        where: { banned: false, emailVerified: true, profile: { views: { gt: myViewsGlobal } } },
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
      const myProfile = await prisma.profile.findUnique({ where: { userId: myUserId }, select: { localViews: true } });
      myViewsLocal = myProfile?.localViews ?? 0;
      const higherCount = await prisma.user.count({
        where: {
          banned: false,
          emailVerified: true,
          leaderboardRegionCode: { not: null, notIn: ["", "XX"] },
          profile: { localViews: { gt: myViewsLocal } },
        },
      });
      myRankLocal = higherCount + 1;
    }
  }

  let searchResult: { username: string; displayName: string; avatar: string; views: number } | null = null;
  let searchRank = 0;
  if (searchQuery) {
    const u = await prisma.user.findFirst({
      where: { username: searchQuery, banned: false, emailVerified: true },
      select: { username: true, profile: { select: { displayName: true, avatar: true, views: true } } },
    });
    if (u && u.profile) {
      searchResult = { username: u.username, displayName: u.profile.displayName || "", avatar: u.profile.avatar || "", views: u.profile.views };
      searchRank = (await prisma.user.count({ where: { banned: false, emailVerified: true, profile: { views: { gt: u.profile.views } } } })) + 1;
    }
  }

  return (
    <>
      <PublicNavbar user={currentUser} active="leaderboard" />
      <div className="lb-page">
        <div className="lb-hero">
          <div className="lb-hero-top">
            <div className="lb-hero-left">
              <div className="lb-hero-label">Hall of Fame</div>
              <div className="lb-hero-title">Views Leaderboard</div>
            </div>
          </div>

          <div className="lb-controls">
            <form className="lb-search-form" method="get" action="/leaderboard">
              <div className="lb-search-wrap">
                <svg className="lb-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input type="text" name="q" className="lb-search-input" placeholder="Search username…" defaultValue={searchQuery} autoComplete="off" />
              </div>
              <button type="submit" className="lb-search-btn">Search</button>
              {searchQuery && <a href="/leaderboard" className="lb-search-clear">✕</a>}
            </form>
          </div>
        </div>

        {searchQuery && (
          <div className="lb-search-result">
            {searchResult ? (
              <div className="lb-search-found">
                <div className="lb-search-rank-badge">#{searchRank.toLocaleString()}</div>
                <SafeImg src={searchResult.avatar ? `/${searchResult.avatar}` : null} className="lb-search-avatar" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: ".95rem" }}>{searchResult.displayName || searchResult.username}</div>
                  <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,.4)", marginTop: ".15rem" }}>
                    @{searchResult.username} · {searchResult.views.toLocaleString()} views
                  </div>
                </div>
                <a href={`/${encodeURIComponent(searchResult.username)}`} className="btn btn-secondary btn-sm lb-search-link" target="_blank" rel="noreferrer">↗ Profile</a>
              </div>
            ) : (
              <div className="lb-search-not-found">No user found for &quot;<strong>{searchQuery}</strong>&quot;</div>
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
      <CookieBanner initialConsent={await getCookieConsent()} />
    </>
  );
}
