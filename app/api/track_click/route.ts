import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const profileUserId = Number(form?.get("uid") || 0);
  const linkId = Number(form?.get("lid") || 0);
  const linkTitle = String(form?.get("title") || "").slice(0, 200);
  const linkUrl = String(form?.get("url") || "").slice(0, 500);

  if (!profileUserId || !linkId) {
    return NextResponse.json({ ok: false, error: "missing params" });
  }

  const ip = (req.headers.get("x-forwarded-for") || "0").split(",")[0].trim();
  const ipHash = crypto.createHash("sha256").update(ip + new Date().toISOString().slice(0, 10)).digest("hex");

  try {
    await prisma.linkClick.create({
      data: { profileUserId, linkId, linkTitle, linkUrl, ipHash, clickedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "db error" });
  }
}
