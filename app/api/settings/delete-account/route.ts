import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { TOTP } from "@/lib/totp";
import { sendActionConfirmEmail } from "@/lib/mail";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const password = String(body.password || "");
  const twoFaCode = String(body.twoFaCode || "").trim();

  if (user.twoFaEnabled) {
    if (!twoFaCode) return NextResponse.json({ error: "2FA code required." }, { status: 400 });
    const totp = new TOTP(user.twoFaSecret!);
    if (!totp.verify(twoFaCode)) return NextResponse.json({ error: "Invalid 2FA code." }, { status: 400 });
  }

  if (!(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 400 });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 3600 * 1000);

  await prisma.actionConfirmation.deleteMany({ where: { userId: user.id, actionType: "delete_account" } });
  await prisma.actionConfirmation.create({
    data: { userId: user.id, actionType: "delete_account", payload: "", token, expiresAt },
  });
  await sendActionConfirmEmail(user.email, user.username, "delete_account", token);

  return NextResponse.json({ success: true, message: "Confirmation email sent. Click the link in the email to permanently delete your account." });
}
