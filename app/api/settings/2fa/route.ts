import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { TOTP } from "@/lib/totp";

const SITE_NAME = process.env.SITE_NAME || "GETFAME.WTF";

/** GET: generate a fresh secret + QR URI for setup. */
export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const secret = TOTP.generateSecret();
  const totp = new TOTP(secret);
  const uri = totp.getQRUri(user.email, SITE_NAME);
  return NextResponse.json({ secret, otpUri: uri });
}

/** POST: confirm setup with a code, enabling 2FA. */
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const secret = String(body.secret || "").trim();
  const code = String(body.code || "").trim();
  if (!secret || !code) return NextResponse.json({ error: "Missing data." }, { status: 400 });

  const totp = new TOTP(secret);
  if (!totp.verify(code)) return NextResponse.json({ error: "Invalid code. Check your phone's clock." }, { status: 400 });

  await prisma.user.update({ where: { id: user.id }, data: { twoFaSecret: secret, twoFaEnabled: true } });
  return NextResponse.json({ success: true });
}

/** DELETE: disable 2FA (requires a valid current code). */
export async function DELETE(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const code = String(body.code || "").trim();
  if (!user.twoFaSecret) return NextResponse.json({ error: "2FA not enabled." }, { status: 400 });
  if (!code) return NextResponse.json({ error: "Enter your 6-digit code." }, { status: 400 });

  const totp = new TOTP(user.twoFaSecret);
  if (!totp.verify(code)) return NextResponse.json({ error: "Invalid code." }, { status: 400 });

  await prisma.user.update({ where: { id: user.id }, data: { twoFaSecret: null, twoFaEnabled: false } });
  return NextResponse.json({ success: true });
}
