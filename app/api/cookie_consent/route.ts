import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const consent = body.consent === "accepted" ? "accepted" : "rejected";

  const session = await getSession();
  if (session) {
    await prisma.user.update({ where: { id: session.userId }, data: { cookieConsent: consent } }).catch(() => {});
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("site_cookie_consent", consent, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
