import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getActiveProfileId } from "@/lib/active-profile";

const MAX_SKILLS = 20;

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  const profileId = await getActiveProfileId(me.id);
  const skills = await prisma.profileSkill.findMany({ where: { profileId }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }], select: { name: true, level: true } });
  return NextResponse.json({ success: true, skills, max: MAX_SKILLS });
}

// Replaces the whole list in one go (the editor saves the list as a unit, including its order).
export async function PUT(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  const profileId = await getActiveProfileId(me.id);
  const body = await req.json().catch(() => ({}));
  const raw: unknown[] = Array.isArray(body.skills) ? body.skills : [];

  const skills = raw
    .map((s) => {
      const o = s as { name?: unknown; level?: unknown };
      return { name: String(o.name || "").trim().slice(0, 40), level: Math.max(0, Math.min(100, Math.round(Number(o.level) || 0))) };
    })
    .filter((s) => s.name)
    .slice(0, MAX_SKILLS);

  await prisma.$transaction([
    prisma.profileSkill.deleteMany({ where: { profileId } }),
    prisma.profileSkill.createMany({ data: skills.map((s, i) => ({ profileId, name: s.name, level: s.level, displayOrder: i })) }),
  ]);
  return NextResponse.json({ success: true, skills });
}
