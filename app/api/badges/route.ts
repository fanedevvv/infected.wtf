import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

/** All badges the current user has earned, including hidden ones, for dashboard management. */
export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  const manual = new Set((profile?.badges as string[] | null) ?? []);
  const hidden = new Set((profile?.badgeHidden as string[] | null) ?? []);
  const order = (profile?.badgeOrder as string[] | null) ?? [];

  const LABELS: Record<string, string> = {
    verified: "Verified", og: "OG", views_master: "Views Master", hall_of_fame: "Hall of Fame",
    champion: "Champion", known: "Known", rich: "Rich", trapstar: "Trapstar", the_killer: "The Killer",
    lover: "Lover", fresh: "Fresh", crew: "Crew", billionaire: "Billionaire",
    content_creator: "Content Creator", designer: "Designer", promoter: "Promoter",
    promoter_elite: "Promoter Elite", owner: "Owner", admin: "Admin", premium: "Premium",
    discord: "Discord", booster: "Server Booster",
  };

  const earned: string[] = [];
  if (manual.has("verified")) earned.push("verified");

  const rank = await prisma.user.count({ where: { id: { lte: user.id } } });
  if (rank <= 1000) earned.push("og");

  const top3 = await prisma.profile.findMany({ orderBy: { views: "desc" }, take: 3, select: { userId: true } });
  if (top3.some((p) => p.userId === user.id)) earned.push("views_master");

  const views = profile?.views ?? 0;
  if (views >= 1000) earned.push("hall_of_fame");
  if (views >= 10000 || manual.has("champion")) earned.push("champion");
  for (const id of ["known", "rich", "trapstar", "the_killer", "lover", "fresh", "crew", "billionaire", "content_creator", "designer"]) {
    if (manual.has(id)) earned.push(id);
  }
  const refCount = await prisma.referral.count({ where: { referrerId: user.id } });
  if (refCount >= 20) earned.push("promoter_elite");
  else if (refCount >= 10) earned.push("promoter");
  if (user.isOwner) earned.push("owner");
  if (user.isAdmin) earned.push("admin");
  const isPremium = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());
  if (isPremium) earned.push("premium");
  const discordLinked = await prisma.integration.findFirst({ where: { userId: user.id, type: "discord" } });
  if (discordLinked) earned.push("discord");
  if (manual.has("booster")) earned.push("booster");

  const badges = earned.map((id) => ({ id, label: LABELS[id] ?? id, hidden: hidden.has(id) }));
  const ordered = order.length
    ? [...order.map((id) => badges.find((b) => b.id === id)).filter(Boolean), ...badges.filter((b) => !order.includes(b.id))]
    : badges;

  return NextResponse.json({ badges: ordered });
}

export async function PATCH(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  const hidden = new Set((profile?.badgeHidden as string[] | null) ?? []);

  if (body.action === "toggleHidden") {
    const id = String(body.badgeId);
    if (hidden.has(id)) hidden.delete(id);
    else hidden.add(id);
    await prisma.profile.update({ where: { userId: user.id }, data: { badgeHidden: Array.from(hidden) } });
  } else if (body.action === "reorder" && Array.isArray(body.order)) {
    await prisma.profile.update({ where: { userId: user.id }, data: { badgeOrder: body.order } });
  }

  return NextResponse.json({ success: true });
}
