import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { TOTP } from "@/lib/totp";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const newUsername = String(body.username || "").trim();
  const twoFaCode = String(body.twoFaCode || "").trim();

  if (user.twoFaEnabled) {
    if (!twoFaCode) return NextResponse.json({ error: "2FA code required." }, { status: 400 });
    const totp = new TOTP(user.twoFaSecret!);
    if (!totp.verify(twoFaCode)) return NextResponse.json({ error: "Invalid 2FA code." }, { status: 400 });
  }

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(newUsername)) {
    return NextResponse.json({ error: "Username must be 3-30 characters: letters, numbers, underscores only." }, { status: 400 });
  }
  if (newUsername === user.username) {
    return NextResponse.json({ error: "That's already your current username." }, { status: 400 });
  }
  if (user.usernameChangedAt) {
    const secsLeft = 7 * 86400 - Math.floor((Date.now() - user.usernameChangedAt.getTime()) / 1000);
    if (secsLeft > 0) {
      return NextResponse.json(
        { error: `You can change your username again in ${Math.ceil(secsLeft / 86400)} day(s).` },
        { status: 400 }
      );
    }
  }
  const taken = await prisma.user.findFirst({ where: { username: newUsername, NOT: { id: user.id } } });
  if (taken) return NextResponse.json({ error: "This username is already taken." }, { status: 400 });

  await prisma.user.update({
    where: { id: user.id },
    data: { username: newUsername, usernameChangedAt: new Date() },
  });
  return NextResponse.json({ success: true, username: newUsername });
}
