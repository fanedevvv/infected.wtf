import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { lookupPinterest } from "@/lib/game-lookup";
import { integrationStatus, disconnectIntegration, toggleIntegrationVisibility } from "@/lib/integration-helpers";

export async function GET() {
  return integrationStatus("pinterest");
}
export async function DELETE() {
  return disconnectIntegration("pinterest");
}
export async function PATCH() {
  return toggleIntegrationVisibility("pinterest");
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const url = String(body.url || "").trim();
  if (!/^https:\/\/([a-z]{2}\.)?pinterest\.[a-z.]+\//i.test(url)) {
    return NextResponse.json({ success: false, error: "Paste a Pinterest profile or board link." }, { status: 400 });
  }

  const result = await lookupPinterest(url);
  if (!result) return NextResponse.json({ success: false, error: "Couldn't find that Pinterest page." }, { status: 400 });

  await prisma.integration.upsert({
    where: { userId_type: { userId: user.id, type: "pinterest" } },
    create: { userId: user.id, type: "pinterest", visible: true, data: JSON.stringify(result) },
    update: { visible: true, data: JSON.stringify(result) },
  });

  return NextResponse.json({ success: true, data: result });
}
