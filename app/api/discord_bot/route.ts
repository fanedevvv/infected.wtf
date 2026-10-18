import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseStringArray } from "@/lib/json-array";

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key") || req.nextUrl.searchParams.get("key") || "";
  const validKey = process.env.DISCORD_BOT_API_KEY || "";
  if (!validKey || apiKey !== validKey) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const action = req.nextUrl.searchParams.get("action") || "";

  if (action === "stats") {
    try {
      const [totalMembers, viewsAgg, premiumCount, profiles] = await Promise.all([
        prisma.user.count({ where: { banned: false, emailVerified: true } }),
        prisma.profile.aggregate({ _sum: { views: true } }),
        prisma.user.count({ where: { isPremium: true, banned: false, emailVerified: true, OR: [{ premiumExpiresAt: null }, { premiumExpiresAt: { gt: new Date() } }] } }),
        prisma.profile.findMany({ select: { badges: true } }),
      ]);
      const verifiedCount = profiles.filter((p) => (parseStringArray(p.badges)).includes("verified")).length;
      return NextResponse.json({
        success: true,
        total_members: totalMembers,
        total_views: viewsAgg._sum.views ?? 0,
        premium_count: premiumCount,
        verified_count: verifiedCount,
        timestamp: Math.floor(Date.now() / 1000),
      });
    } catch (e) {
      return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
    }
  }

  if (action === "top_views") {
    try {
      const siteUrl = (process.env.SITE_URL || "https://infected.wtf").replace(/\/$/, "");
      const rows = await prisma.profile.findMany({
        where: { user: { banned: false, emailVerified: true } },
        orderBy: { views: "desc" },
        take: 10,
        select: { slug: true, displayName: true, avatar: true, views: true, user: { select: { isPremium: true } } },
      });
      const data = rows.map((row, i) => ({
        rank: i + 1,
        username: row.slug,
        display_name: row.displayName || "",
        views: row.views ?? 0,
        avatar_url: row.avatar ? `${siteUrl}/uploads/avatars/${row.avatar.split("/").pop()}` : null,
        is_premium: row.user.isPremium,
        profile_url: `${siteUrl}/${encodeURIComponent(row.slug)}`,
      }));
      return NextResponse.json({ success: true, data });
    } catch {
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: false, error: "Unknown action. Available: stats, top_views" }, { status: 400 });
}
