import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { parseStringArray } from "@/lib/json-array";
import { getAllEmailTemplates } from "@/lib/email-templates";
import AdminClient from "./AdminClient";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const params = await searchParams;
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.banned) redirect("/banned");
  if (!me.isAdmin && !me.isOwner && !me.isMod) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,.5)" }}>403 Forbidden</div>
    );
  }

  const iAmOwner = me.isOwner;
  const iAmAdmin = me.isAdmin;
  const iAmMod = me.isMod;

  let canGrantOwner = false;
  let myOwnerRank = 0;
  if (iAmOwner) {
    myOwnerRank = (await prisma.user.count({ where: { isOwner: true, id: { lt: me.id } } })) + 1;
    canGrantOwner = myOwnerRank <= 3;
  }

  const [totalUsers, totalLinks, bannedCount, premiumCount] = await Promise.all([
    prisma.user.count({ where: { emailVerified: true } }),
    prisma.socialLink.count(),
    prisma.user.count({ where: { banned: true } }),
    prisma.user.count({ where: { isPremium: true, OR: [{ premiumExpiresAt: null }, { premiumExpiresAt: { gt: new Date() } }] } }),
  ]);
  const viewsAgg = await prisma.profile.aggregate({ _sum: { views: true } });
  const totalViews = viewsAgg._sum.views ?? 0;
  const tokensAgg = await prisma.user.aggregate({ _sum: { tokensSpent: true } });
  const totalTokensSpent = tokensAgg._sum.tokensSpent ?? 0;
  const badgeProfiles = await prisma.profile.findMany({ select: { badges: true } });
  const verifiedCount = badgeProfiles.filter((p) => parseStringArray(p.badges).includes("verified")).length;

  const settings = await prisma.siteSettings.findFirst();
  const whitelistEnabled = settings?.whitelistEnabled ?? false;
  const x2EventEnabled = settings?.x2TokensEnabled ?? false;

  const allBundles = iAmOwner ? await prisma.bundle.findMany({ orderBy: { createdAt: "desc" } }) : [];
  const allRedeemCodes = iAmOwner ? await prisma.redeemCode.findMany({ orderBy: { createdAt: "desc" } }) : [];
  const allDynamicBadges = iAmOwner ? await prisma.dynamicBadge.findMany({ orderBy: { createdAt: "desc" } }) : [];
  const allDomains = iAmOwner ? await prisma.siteDomain.findMany({ orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }) : [];
  const allEmailTemplates = iAmOwner ? await getAllEmailTemplates() : [];

  const perPage = 10;
  const page = Math.max(1, parseInt(params.page || "1") || 1);
  const search = (params.q || "").trim();
  const where = { emailVerified: true, ...(search ? { OR: [{ username: { contains: search } }, { email: { contains: search } }] } : {}) };

  const totalFiltered = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalFiltered / perPage));
  const clampedPage = Math.min(page, totalPages);

  const usersRaw = await prisma.user.findMany({
    where,
    orderBy: { id: "asc" },
    skip: (clampedPage - 1) * perPage,
    take: perPage,
    select: {
      id: true, username: true, isAdmin: true, isOwner: true, isMod: true, banned: true, banUntil: true,
      createdAt: true, tokens: true, isPremium: true, premiumExpiresAt: true,
      profiles: { where: { isPrimary: true }, take: 1, select: { views: true, badges: true, avatar: true, purchasedEffects: true, decorationsOwned: true } },
      _count: { select: { socialLinks: true } },
    },
  });

  const users = usersRaw.map((u) => {
    const profile = u.profiles[0];
    return {
      id: u.id,
      username: u.username,
      isAdmin: u.isAdmin,
      isOwner: u.isOwner,
      isMod: u.isMod,
      banned: u.banned,
      banUntil: u.banUntil ? u.banUntil.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
      tokens: u.tokens,
      isPremium: u.isPremium,
      premiumExpiresAt: u.premiumExpiresAt ? u.premiumExpiresAt.toISOString() : null,
      views: profile?.views ?? 0,
      links: u._count.socialLinks,
      badges: parseStringArray(profile?.badges),
      effects: parseStringArray(profile?.purchasedEffects),
      decorations: parseStringArray(profile?.decorationsOwned),
      avatar: profile?.avatar ? `/${profile.avatar}` : "/assets/img/default-avatar.png",
    };
  });

  return (
    <AdminClient
      iAmOwner={iAmOwner}
      iAmAdmin={iAmAdmin}
      iAmMod={iAmMod}
      canGrantOwner={canGrantOwner}
      myOwnerRank={myOwnerRank}
      myUserId={me.id}
      stats={{ totalUsers, totalViews, totalLinks, totalTokensSpent, premiumCount, verifiedCount, bannedCount }}
      whitelistEnabled={whitelistEnabled}
      x2EventEnabled={x2EventEnabled}
      bundles={allBundles.map((b) => ({
        id: b.id,
        name: b.name,
        price: Number(b.price),
        priceType: b.priceType as "euro" | "tokens",
        badges: parseStringArray(b.badges),
        effects: parseStringArray(b.effects),
        premiumDays: b.premiumDays,
      }))}
      redeemCodes={allRedeemCodes.map((r) => ({
        id: r.id,
        code: r.code,
        tokens: r.tokens,
        maxUses: r.maxUses,
        usesCount: r.usesCount,
        expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
        active: r.active,
      }))}
      dynamicBadges={allDynamicBadges.map((d) => ({
        badgeKey: d.badgeKey,
        label: d.label,
        color: d.color || "#5865F2",
      }))}
      siteDomains={allDomains.map((d) => ({
        id: d.id,
        hostname: d.hostname,
        status: d.status,
        errorMessage: d.errorMessage,
        isDefault: d.isDefault,
      }))}
      emailTemplates={allEmailTemplates.map((t) => ({
        id: t.id,
        templateKey: t.templateKey,
        subject: t.subject,
        bodyHtml: t.bodyHtml,
        availableVariables: t.availableVariables,
        updatedAt: t.updatedAt.toISOString(),
      }))}
      users={users}
      page={clampedPage}
      totalPages={totalPages}
      search={search}
    />
  );
}
