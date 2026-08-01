import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const integration = await prisma.integration.findUnique({
    where: { userId_type: { userId: user.id, type: "discord" } },
  });
  return NextResponse.json({ integration });
}

export async function DELETE() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.integration.deleteMany({ where: { userId: user.id, type: "discord" } });

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  const badges = new Set((profile?.badges as string[] | null) ?? []);
  badges.delete("discord");
  await prisma.profile.update({ where: { userId: user.id }, data: { badges: Array.from(badges) } });

  return NextResponse.json({ success: true });
}
