import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/crypto";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = String(body.token || "");
  if (!token) return NextResponse.json({ success: false, error: "Invalid token." }, { status: 400 });

  const tokenHash = sha256(token);
  const user = await prisma.user.findFirst({
    where: { switchToken: tokenHash, switchTokenExpires: { gt: new Date() } },
  });
  if (!user) return NextResponse.json({ success: false, error: "Switch token expired. Please re-add this account." }, { status: 401 });
  if (user.banned) return NextResponse.json({ success: false, error: "This account is banned." }, { status: 403 });

  const newToken = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: { switchToken: sha256(newToken), switchTokenExpires: new Date(Date.now() + 30 * 24 * 3600 * 1000) },
  });

  await createSession(user.id);
  return NextResponse.json({ success: true, username: user.username, newToken });
}
