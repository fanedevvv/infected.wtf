import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = parseInt(req.nextUrl.searchParams.get("uid") || "0", 10);
  if (!userId) return NextResponse.json({ banned: true }, { headers: { "Cache-Control": "no-store" } });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { banned: true, banUntil: true } });
  if (!user) return NextResponse.json({ banned: false }, { headers: { "Cache-Control": "no-store" } });

  let isBanned = user.banned;
  if (isBanned && user.banUntil && user.banUntil.getTime() <= Date.now()) {
    await prisma.user.update({ where: { id: userId }, data: { banned: false, banUntil: null } });
    isBanned = false;
  }
  return NextResponse.json({ banned: isBanned }, { headers: { "Cache-Control": "no-store" } });
}
