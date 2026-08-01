import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createSession, createPendingTwoFaToken, setPendingTwoFaCookie } from "@/lib/session";
import { sendNewLoginEmail } from "@/lib/mail";
import { decryptEmail, sha256 } from "@/lib/crypto";

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "";
  return fwd.split(",")[0].trim() || "0.0.0.0";
}

function parseDevice(ua: string): { device: string; browser: string } {
  let device = "desktop";
  if (/tablet|ipad/i.test(ua)) device = "tablet";
  else if (/mobile|android|iphone|ipod/i.test(ua)) device = "mobile";

  let browser = "Unknown";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua)) browser = "Safari";

  return { device, browser };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const identifier = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!identifier || !password) {
    return NextResponse.json({ error: "Please fill in all fields." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { username: identifier },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  if (user.banned) {
    return NextResponse.json(
      { error: "banned", banUntil: user.banUntil, userId: user.id },
      { status: 403 }
    );
  }

  if (!user.emailVerified) {
    return NextResponse.json({ error: "Please verify your email before logging in." }, { status: 403 });
  }

  const ip = clientIp(req);
  const ipHash = sha256(ip);
  const ua = req.headers.get("user-agent") || "";
  const { device, browser } = parseDevice(ua);

  const knownDevice = await prisma.loginHistory.findFirst({ where: { userId: user.id, ipHash } });

  await prisma.loginHistory.create({
    data: { userId: user.id, ipHash, ipDisplay: ip, deviceType: device, browser },
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

  if (!knownDevice && user.loginNotify) {
    const email = decryptEmail(user.email);
    await sendNewLoginEmail(email, user.username, {
      time: new Date().toUTCString(),
      browser,
      device,
      ip: ip.replace(/\.\d+$/, ".*"),
      country: req.headers.get("cf-ipcountry") || "Unknown",
    });
  }

  if (user.twoFaEnabled) {
    const pendingToken = createPendingTwoFaToken(user.id);
    await setPendingTwoFaCookie(pendingToken);
    return NextResponse.json({ success: true, requiresTwoFa: true });
  }

  await createSession(user.id);
  return NextResponse.json({ success: true });
}
