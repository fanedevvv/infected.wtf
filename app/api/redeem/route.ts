import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = String(body.code || "").trim().toUpperCase();
  if (!code) return NextResponse.json({ success: false, error: "Enter a code." }, { status: 400 });

  const row = await prisma.redeemCode.findUnique({ where: { code } });
  if (!row || !row.active) return NextResponse.json({ success: false, error: "Invalid code." }, { status: 400 });
  if (row.expiresAt && row.expiresAt < new Date()) return NextResponse.json({ success: false, error: "This code has expired." }, { status: 400 });
  if (row.usesCount >= row.maxUses) return NextResponse.json({ success: false, error: "This code has already been fully redeemed." }, { status: 400 });

  const already = await prisma.redeemCodeUse.findUnique({ where: { codeId_userId: { codeId: row.id, userId: user.id } } });
  if (already) return NextResponse.json({ success: false, error: "You've already redeemed this code." }, { status: 400 });

  try {
    await prisma.$transaction([
      prisma.redeemCodeUse.create({ data: { codeId: row.id, userId: user.id } }),
      prisma.redeemCode.update({ where: { id: row.id }, data: { usesCount: { increment: 1 } } }),
      prisma.user.update({ where: { id: user.id }, data: { tokens: { increment: row.tokens } } }),
    ]);
  } catch {
    return NextResponse.json({ success: false, error: "You've already redeemed this code." }, { status: 400 });
  }

  return NextResponse.json({ success: true, tokens: row.tokens });
}
