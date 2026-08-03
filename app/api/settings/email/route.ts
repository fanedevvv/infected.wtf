import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { TOTP } from "@/lib/totp";
import { encryptEmail, emailBlindIndex } from "@/lib/crypto";
import { sendEmailChangeVerification } from "@/lib/mail";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const newEmail = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const twoFaCode = String(body.twoFaCode || "").trim();

  if (user.twoFaEnabled) {
    if (!twoFaCode) return NextResponse.json({ error: "2FA code required." }, { status: 400 });
    const totp = new TOTP(user.twoFaSecret!);
    if (!totp.verify(twoFaCode)) return NextResponse.json({ error: "Invalid 2FA code." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }
  if (!(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: "Incorrect current password." }, { status: 400 });
  }
  if (user.email.toLowerCase() === newEmail) {
    return NextResponse.json({ error: "That's already your current email." }, { status: 400 });
  }

  const blindIndex = emailBlindIndex(newEmail);
  const taken = await prisma.user.findFirst({ where: { emailBlindIndex: blindIndex, NOT: { id: user.id } } });
  if (taken) return NextResponse.json({ error: "This email is already in use." }, { status: 400 });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);

  await prisma.emailChangePending.deleteMany({ where: { userId: user.id } });
  await prisma.emailChangePending.create({
    data: { userId: user.id, newEmail: encryptEmail(newEmail), token, expiresAt },
  });
  await sendEmailChangeVerification(user.email, user.username, newEmail, token);

  return NextResponse.json({ success: true, message: `Verification email sent to ${newEmail}. Click the link to confirm.` });
}
