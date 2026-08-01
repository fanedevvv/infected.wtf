import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = String(body.token || "");
  const password = String(body.password || "");
  const confirm = String(body.confirm || "");

  if (!token) return NextResponse.json({ error: "Invalid or missing token." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (password !== confirm) return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });

  const tokenHash = sha256(token);
  const record = await prisma.passwordReset.findUnique({ where: { tokenHash } });
  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hash } }),
    prisma.passwordReset.delete({ where: { id: record.id } }),
  ]);

  return NextResponse.json({ success: true });
}
