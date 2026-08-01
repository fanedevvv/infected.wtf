import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET() {
  const me = await getCurrentUser();
  if (!me || !me.isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const settings = await prisma.siteSettings.findFirst();
  return NextResponse.json({ whitelistEnabled: settings?.whitelistEnabled ?? false });
}

export async function POST() {
  const me = await getCurrentUser();
  if (!me || !me.isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let settings = await prisma.siteSettings.findFirst();
  if (!settings) {
    settings = await prisma.siteSettings.create({ data: { whitelistEnabled: true, updatedBy: me.id } });
  } else {
    settings = await prisma.siteSettings.update({
      where: { id: settings.id },
      data: { whitelistEnabled: !settings.whitelistEnabled, updatedBy: me.id },
    });
  }
  return NextResponse.json({ whitelistEnabled: settings.whitelistEnabled });
}
