import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { lookupMinecraft } from "@/lib/game-lookup";
import { integrationStatus, disconnectIntegration, toggleIntegrationVisibility } from "@/lib/integration-helpers";

export async function GET() {
  return integrationStatus("minecraft");
}
export async function DELETE() {
  return disconnectIntegration("minecraft");
}
export async function PATCH() {
  return toggleIntegrationVisibility("minecraft");
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  if (!username) return NextResponse.json({ success: false, error: "Enter a Minecraft username." }, { status: 400 });

  const result = await lookupMinecraft(username);
  if (!result) return NextResponse.json({ success: false, error: "Minecraft account not found." }, { status: 400 });

  await prisma.integration.upsert({
    where: { userId_type: { userId: user.id, type: "minecraft" } },
    create: { userId: user.id, type: "minecraft", visible: true, data: result },
    update: { visible: true, data: result },
  });

  return NextResponse.json({ success: true, data: result });
}
