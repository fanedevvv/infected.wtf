import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const links = await prisma.socialLink.findMany({ where: { userId: user.id }, orderBy: { displayOrder: "asc" } });
  return NextResponse.json({ links });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const platform = String(body.platform || "website").slice(0, 50);
  const url = String(body.url || "").slice(0, 500);
  if (!url) return NextResponse.json({ error: "URL is required." }, { status: 400 });

  const count = await prisma.socialLink.count({ where: { userId: user.id } });
  const link = await prisma.socialLink.create({
    data: { userId: user.id, platform, url, displayOrder: count },
  });
  return NextResponse.json({ success: true, link });
}
