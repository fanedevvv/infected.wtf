import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { TOTP } from "@/lib/totp";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const current = String(body.currentPassword || "");
  const next = String(body.newPassword || "");
  const confirm = String(body.confirmPassword || "");
  const twoFaCode = String(body.twoFaCode || "").trim();

  if (user.twoFaEnabled) {
    if (!twoFaCode) return NextResponse.json({ error: "2FA code required." }, { status: 400 });
    const totp = new TOTP(user.twoFaSecret!);
    if (!totp.verify(twoFaCode)) return NextResponse.json({ error: "Invalid 2FA code." }, { status: 400 });
  }

  if (!(await bcrypt.compare(current, user.password))) {
    return NextResponse.json({ error: "Incorrect current password." }, { status: 400 });
  }
  if (next.length < 6) return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
  if (next !== confirm) return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });

  const hash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hash } });
  return NextResponse.json({ success: true });
}
