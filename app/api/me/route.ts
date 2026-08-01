import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  const { password: _password, twoFaSecret: _twoFaSecret, ...safeUser } = user;
  void _password;
  void _twoFaSecret;

  return NextResponse.json({ user: safeUser, profile });
}
