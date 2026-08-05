import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createSession, createPendingTwoFaToken, setPendingTwoFaCookie } from "@/lib/session";
import { sendNewLoginEmail } from "@/lib/mail";
import { decryptEmail, sha256, emailBlindIndex } from "@/lib/crypto";

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "";
  return fwd.split(",")[0].trim() || "0.0.0.0";
}

function parseDevice(ua: string): { device: string; browser: string } {
  let device = "desktop";
  if (/mobile|android|iphone|ipad/i.test(ua)) device = "mobile";
  let browser = "Unknown";
  if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua)) browser = "Safari";
  else if (/Opera|OPR\//i.test(ua)) browser = "Opera";
  return { device, browser };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const login = String(body.login || body.username || "").trim();
  const password = String(body.password || "");
  const remember = Boolean(body.remember);
  const twoFaCode = String(body.twoFaCode || "").trim();

  const ip = clientIp(req);
  const ipHash = sha256(ip);

  if (!login || !password) {
    return NextResponse.json({ error: "Please fill in all fields." }, { status: 400 });
  }

  // ── Rate limit: max 5 failed attempts per IP per 10 minutes ──
  const recentAttempts = await prisma.rateLimit.count({
    where: { type: "login", ipHash, attemptedAt: { gt: new Date(Date.now() - 10 * 60 * 1000) } },
  }).catch(() => 0);
  if (recentAttempts >= 5) {
    return NextResponse.json({ error: "Too many failed login attempts. Please wait 10 minutes and try again." }, { status: 429 });
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ username: login }, { emailBlindIndex: emailBlindIndex(login) }] },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    await prisma.rateLimit.create({ data: { type: "login", ipHash } }).catch(() => {});
    return NextResponse.json({ error: "Invalid login credentials." }, { status: 401 });
  }

  if (!user.emailVerified) {
    return NextResponse.json({ error: "Please verify your email before signing in. Check your inbox for the verification link." }, { status: 403 });
  }

  if (user.banned) {
    return NextResponse.json({ error: "banned", banUntil: user.banUntil, userId: user.id }, { status: 403 });
  }

  if (user.twoFaEnabled) {
    if (!twoFaCode) {
      const pendingToken = createPendingTwoFaToken(user.id);
      await setPendingTwoFaCookie(pendingToken);
      return NextResponse.json({ success: true, requiresTwoFa: true });
    }
    const { TOTP } = await import("@/lib/totp");
    const totp = new TOTP(user.twoFaSecret!);
    if (!totp.verify(twoFaCode)) {
      return NextResponse.json({ error: "Invalid 2FA code. Please try again." }, { status: 401 });
    }
  }

  // ── Re-login verification if inactive 30+ days ──
  if (user.lastLogin && Date.now() - user.lastLogin.getTime() > 30 * 24 * 3600 * 1000) {
    const { sendReloginVerificationEmail } = await import("@/lib/mail");
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.actionConfirmation.deleteMany({ where: { userId: user.id, actionType: "relogin" } });
    await prisma.actionConfirmation.create({
      data: { userId: user.id, actionType: "relogin", payload: "", token, expiresAt: new Date(Date.now() + 3600 * 1000) },
    });
    await sendReloginVerificationEmail(decryptEmail(user.email), user.username, token);
    return NextResponse.json({ relogin: true, email: decryptEmail(user.email).replace(/(.{2}).*(@.*)/, "$1***$2") });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

  const ua = req.headers.get("user-agent") || "";
  const { device, browser } = parseDevice(ua);
  const knownDevice = await prisma.loginHistory.findFirst({ where: { userId: user.id, ipHash, deviceType: device } });
  const octets = ip.split(".");
  const ipDisplay = `${octets[0] || "***"}.*.*.*`;
  await prisma.loginHistory.create({ data: { userId: user.id, ipHash, ipDisplay, deviceType: device, browser } });

  if (!knownDevice && user.loginNotify) {
    await sendNewLoginEmail(decryptEmail(user.email), user.username, {
      time: new Date().toUTCString(),
      browser,
      device,
      ip: ip.replace(/\.\d+$/, ".*"),
      country: req.headers.get("cf-ipcountry") || "Unknown",
    });
  }

  if (remember) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: { rememberToken: sha256(token), tokenExpires: new Date(Date.now() + 30 * 24 * 3600 * 1000) },
    });
    const res = NextResponse.json({ success: true });
    res.cookies.set("remember_token", token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
      path: "/", maxAge: 30 * 24 * 3600,
    });
    await createSession(user.id);
    await creditReferralIfPending(user.id);
    return res;
  }

  await createSession(user.id);
  await creditReferralIfPending(user.id);
  return NextResponse.json({ success: true });
}

async function creditReferralIfPending(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.referredBy) return;
  const already = await prisma.referral.findUnique({ where: { referredId: userId } });
  if (already) return;
  const referrer = await prisma.user.findFirst({
    where: { OR: [{ referralCode: user.referredBy }, { username: user.referredBy }] },
  });
  if (!referrer || referrer.id === userId) return;
  const refIsPremium = referrer.isPremium && (!referrer.premiumExpiresAt || referrer.premiumExpiresAt > new Date());
  const tokens = refIsPremium ? 20 : 10;
  await prisma.$transaction([
    prisma.user.update({ where: { id: referrer.id }, data: { tokens: { increment: tokens } } }),
    prisma.referral.create({ data: { referrerId: referrer.id, referredId: userId, tokensGiven: tokens } }),
    prisma.notification.create({
      data: {
        userId: referrer.id,
        type: "referral",
        title: "New referral! 🎉",
        body: `Someone just signed up using your referral link. You earned ${tokens} tokens!`,
        icon: "users",
        link: "/dashboard?page=referral",
      },
    }),
  ]);
}
