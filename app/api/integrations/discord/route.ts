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

  const row = await prisma.integration.findUnique({ where: { userId_type: { userId: user.id, type: "discord" } } });
  if (row) {
    if (row.discordServerInvite) {
      await prisma.integration.update({
        where: { id: row.id },
        data: {
          discordUserId: null,
          discordUsername: null,
          discordAvatar: null,
          discordGlobalName: null,
          visible: true,
        },
      });
    } else {
      await prisma.integration.delete({ where: { id: row.id } });
    }
  }

  const profile = await prisma.profile.findFirst({ where: { userId: user.id , isPrimary: true } });
  const badges = new Set((profile?.badges as string[] | null) ?? []);
  badges.delete("discord");
  await prisma.profile.updateMany({ where: { userId: user.id , isPrimary: true }, data: { badges: Array.from(badges) } });

  return NextResponse.json({ success: true });
}

export async function PATCH() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const row = await prisma.integration.findUnique({ where: { userId_type: { userId: user.id, type: "discord" } } });
  if (!row) return NextResponse.json({ success: false, error: "Integration not found." });
  const newVal = !row.visible;
  await prisma.integration.update({ where: { id: row.id }, data: { visible: newVal } });
  return NextResponse.json({ success: true, message: newVal ? "Integration visible on profile." : "Integration hidden from profile." });
}
