import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { integrationStatus, disconnectIntegration, toggleIntegrationVisibility } from "@/lib/integration-helpers";

export async function GET() {
  return integrationStatus("twitch");
}
export async function DELETE() {
  return disconnectIntegration("twitch");
}
export async function PATCH() {
  return toggleIntegrationVisibility("twitch");
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim().replace(/^@/, "").slice(0, 25);

  if (!username || !/^[a-zA-Z0-9_]{4,25}$/.test(username)) {
    return NextResponse.json({ success: false, error: "Enter a valid Twitch username." }, { status: 400 });
  }

  const result = { username };
  await prisma.integration.upsert({
    where: { userId_type: { userId: user.id, type: "twitch" } },
    create: { userId: user.id, type: "twitch", visible: true, data: result },
    update: { visible: true, data: result },
  });

  return NextResponse.json({ success: true, data: result });
}
