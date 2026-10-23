import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { lookupYoutube } from "@/lib/game-lookup";
import { integrationStatus, disconnectIntegration, toggleIntegrationVisibility } from "@/lib/integration-helpers";

export async function GET() {
  return integrationStatus("youtube");
}
export async function DELETE() {
  return disconnectIntegration("youtube");
}
export async function PATCH() {
  return toggleIntegrationVisibility("youtube");
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const url = String(body.url || "").trim();
  if (!/^https:\/\/(www\.)?youtube\.com\/(@|channel\/|c\/|user\/)/i.test(url)) {
    return NextResponse.json({ success: false, error: "Paste a YouTube channel link (youtube.com/@name)." }, { status: 400 });
  }

  const result = await lookupYoutube(url);
  if (!result) return NextResponse.json({ success: false, error: "Couldn't find that YouTube channel." }, { status: 400 });

  await prisma.integration.upsert({
    where: { userId_type: { userId: user.id, type: "youtube" } },
    create: { userId: user.id, type: "youtube", visible: true, data: JSON.stringify(result) },
    update: { visible: true, data: JSON.stringify(result) },
  });

  return NextResponse.json({ success: true, data: result });
}
