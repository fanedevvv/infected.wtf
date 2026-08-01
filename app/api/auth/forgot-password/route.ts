import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { emailBlindIndex, decryptEmail, sha256 } from "@/lib/crypto";
import { sendPasswordResetEmail } from "@/lib/mail";

const GENERIC_OK = "If that account exists, a reset link has been sent to its email address.";

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "";
  return fwd.split(",")[0].trim() || "0.0.0.0";
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const identifier = String(body.email || "").trim();
  if (!identifier || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const ipHash = sha256(clientIp(req));
  const recentAttempts = await prisma.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*) as cnt FROM rate_limits
    WHERE type = 'forgot' AND ip_hash = ${ipHash} AND attempted_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
  `.catch(() => [{ cnt: BigInt(0) }]);
  if (Number(recentAttempts[0]?.cnt ?? 0) >= 3) {
    return NextResponse.json({ error: "Too many requests. Please wait 15 minutes before trying again." }, { status: 429 });
  }
  await prisma.$executeRaw`INSERT INTO rate_limits (type, ip_hash) VALUES ('forgot', ${ipHash})`.catch(() => {});

  const user = await prisma.user.findFirst({ where: { emailBlindIndex: emailBlindIndex(identifier) } });
  if (!user || !user.emailVerified || user.banned) {
    return NextResponse.json({ success: true, message: GENERIC_OK });
  }

  const recentReset = await prisma.passwordReset.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) } },
  });
  if (recentReset) return NextResponse.json({ success: true, message: GENERIC_OK });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(rawToken);
  await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
  await prisma.passwordReset.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 3600 * 1000) },
  });

  await sendPasswordResetEmail(decryptEmail(user.email), user.username, rawToken);
  return NextResponse.json({ success: true, message: GENERIC_OK });
}
