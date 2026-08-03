import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findFirst();
    return NextResponse.json({ maintenance: !!settings?.whitelistEnabled }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ maintenance: true }, { headers: { "Cache-Control": "no-store" } });
  }
}
