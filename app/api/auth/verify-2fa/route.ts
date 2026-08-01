import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TOTP } from "@/lib/totp";
import { createSession, getPendingTwoFaUserId, clearPendingTwoFaCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  const userId = await getPendingTwoFaUserId();
  if (!userId) return NextResponse.json({ error: "No pending 2FA login." }, { status: 401 });

  const body = await req.json();
  const code = String(body.code || "").trim();
  if (!code) return NextResponse.json({ error: "Enter your 6-digit code." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFaSecret) return NextResponse.json({ error: "2FA not configured." }, { status: 400 });

  const totp = new TOTP(user.twoFaSecret);
  if (!totp.verify(code)) return NextResponse.json({ error: "Invalid code." }, { status: 401 });

  await clearPendingTwoFaCookie();
  await createSession(user.id);
  return NextResponse.json({ success: true });
}
