import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const login = String(body.login || "").trim();
  const password = String(body.password || "");

  const user = await prisma.user.findFirst({ where: { username: login } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ success: false, error: "Invalid credentials." }, { status: 401 });
  }
  if (user.banned) return NextResponse.json({ success: false, error: "This account is banned." }, { status: 403 });
  if (!user.emailVerified) return NextResponse.json({ success: false, error: "This account is not verified." }, { status: 403 });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: { switchToken: sha256(token), switchTokenExpires: new Date(Date.now() + 30 * 24 * 3600 * 1000) },
  });

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ success: true, username: user.username, switchToken: token, avatar: profile?.avatar || null });
}
