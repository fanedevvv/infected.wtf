import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { lookupMcServer } from "@/lib/game-lookup";
import { integrationStatus, disconnectIntegration, toggleIntegrationVisibility } from "@/lib/integration-helpers";

export async function GET() {
  return integrationStatus("mcserver");
}
export async function DELETE() {
  return disconnectIntegration("mcserver");
}
export async function PATCH() {
  return toggleIntegrationVisibility("mcserver");
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const host = String(body.host || "").trim();
  if (!host) return NextResponse.json({ success: false, error: "Enter a server address." }, { status: 400 });

  const result = await lookupMcServer(host);
  if (!result) return NextResponse.json({ success: false, error: "Couldn't reach that server." }, { status: 400 });

  await prisma.integration.upsert({
    where: { userId_type: { userId: user.id, type: "mcserver" } },
    create: { userId: user.id, type: "mcserver", visible: true, data: result },
    update: { visible: true, data: result },
  });

  return NextResponse.json({ success: true, data: result });
}
