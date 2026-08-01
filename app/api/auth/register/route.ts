import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { encryptEmail, emailBlindIndex, sha256 } from "@/lib/crypto";
import { isAllowedEmailDomain } from "@/lib/allowed-email-domains";
import { validateUsername } from "@/lib/auth-helpers";
import { sendVerificationEmail } from "@/lib/mail";

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "";
  return fwd.split(",")[0].trim() || "0.0.0.0";
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const username = String(body.username || "").trim();
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  const confirm = String(body.confirm || "");
  const terms = Boolean(body.terms);
  const referralInput = String(body.referralCode || "").trim();

  if (!username || !email || !password) {
    return NextResponse.json({ error: "Please fill in all fields." }, { status: 400 });
  }
  if (!validateUsername(username)) {
    return NextResponse.json({ error: "Username: 3-30 characters, letters/digits/_ - ." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }
  if (!isAllowedEmailDomain(email)) {
    return NextResponse.json(
      { error: "Please use a real email address (Gmail, Outlook, Yahoo, iCloud etc.)." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (password !== confirm) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }
  if (!terms) {
    return NextResponse.json({ error: "You must agree to the Terms of Service and Privacy Policy." }, { status: 400 });
  }

  const blindIndex = emailBlindIndex(email);
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { emailBlindIndex: blindIndex }] },
    select: { id: true, emailVerified: true },
  });

  if (existing) {
    if (!existing.emailVerified) {
      const last = await prisma.emailVerification.findFirst({
        where: { userId: existing.id },
        orderBy: { createdAt: "desc" },
      });
      const secsLeft = last ? Math.max(0, 60 - Math.floor((Date.now() - last.createdAt.getTime()) / 1000)) : 0;
      if (secsLeft === 0) {
        const user = await prisma.user.findUnique({ where: { id: existing.id } });
        if (user) {
          const token = crypto.randomBytes(32).toString("hex");
          await prisma.emailVerification.deleteMany({ where: { userId: existing.id, used: false } });
          await prisma.emailVerification.create({
            data: { userId: existing.id, token, expiresAt: new Date(Date.now() + 24 * 3600 * 1000) },
          });
          await sendVerificationEmail(email, user.username, token);
        }
      }
      return NextResponse.json({ success: true, rateLimited: true, pendingEmail: email, secsLeft });
    }
    return NextResponse.json({ error: "Username or email already in use." }, { status: 400 });
  }

  const regIp = clientIp(req);
  const regIpHash = sha256(regIp);
  const ipCount = await prisma.user.count({ where: { regIpHash } });
  if (ipCount >= 3) {
    return NextResponse.json(
      { error: "Maximum 3 accounts can be registered from the same IP address." },
      { status: 429 }
    );
  }

  let pendingRef: string | null = null;
  if (referralInput) {
    const refUser = await prisma.user.findFirst({
      where: { OR: [{ referralCode: referralInput }, { username: referralInput }] },
      select: { id: true },
    });
    if (refUser) pendingRef = referralInput;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const refCode = crypto
    .createHash("md5")
    .update(username + Date.now())
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();

  const user = await prisma.user.create({
    data: {
      username,
      email: encryptEmail(email),
      emailBlindIndex: blindIndex,
      password: passwordHash,
      referralCode: refCode,
      referredBy: pendingRef,
      emailVerified: false,
      regIpHash,
      profile: { create: { displayName: username } },
    },
  });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.emailVerification.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 24 * 3600 * 1000) },
  });
  await sendVerificationEmail(email, username, token);

  return NextResponse.json({ success: true, pendingEmail: email });
}
