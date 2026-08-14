import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { getActiveProfileId } from "@/lib/active-profile";

const MAX_DOMAINS_PER_PROFILE = 3;

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const activeProfileId = await getActiveProfileId(user.id);
  const isPremium = !!(user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date()));
  const [domains, selected] = await Promise.all([
    prisma.siteDomain.findMany({ where: { status: "active" }, orderBy: [{ isDefault: "desc" }, { tier: "asc" }, { hostname: "asc" }], select: { id: true, hostname: true, tier: true, isDefault: true } }),
    prisma.profileDomain.findMany({ where: { profileId: activeProfileId }, select: { domainId: true } }),
  ]);
  return NextResponse.json({
    domains,
    selected: selected.map((s) => s.domainId),
    max: MAX_DOMAINS_PER_PROFILE,
    isPremium,
  });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const activeProfileId = await getActiveProfileId(user.id);
  const body = await req.json().catch(() => ({}));
  const domainId = Number(body.domain_id || 0);
  const select = !!body.select;

  const domain = await prisma.siteDomain.findUnique({ where: { id: domainId } });
  if (!domain || domain.status !== "active") return NextResponse.json({ success: false, error: "Domain not available." }, { status: 400 });
  if (domain.isDefault) return NextResponse.json({ success: false, error: "The default domain is always on." }, { status: 400 });

  if (select && domain.tier === "premium") {
    const isPremium = !!(user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date()));
    if (!isPremium) return NextResponse.json({ success: false, error: "This domain is premium-only." }, { status: 403 });
  }

  if (select) {
    const count = await prisma.profileDomain.count({ where: { profileId: activeProfileId } });
    const already = await prisma.profileDomain.findUnique({ where: { profileId_domainId: { profileId: activeProfileId, domainId } } }).catch(() => null);
    if (!already && count >= MAX_DOMAINS_PER_PROFILE) {
      return NextResponse.json({ success: false, error: `You can only use up to ${MAX_DOMAINS_PER_PROFILE} domains at once.` }, { status: 400 });
    }
    await prisma.profileDomain.upsert({
      where: { profileId_domainId: { profileId: activeProfileId, domainId } },
      update: {},
      create: { profileId: activeProfileId, domainId },
    });
  } else {
    await prisma.profileDomain.deleteMany({ where: { profileId: activeProfileId, domainId } });
  }

  return NextResponse.json({ success: true });
}
