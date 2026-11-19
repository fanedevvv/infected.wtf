import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { lookupSampServer } from "@/lib/game-lookup";
import { integrationStatus, disconnectIntegration, toggleIntegrationVisibility } from "@/lib/integration-helpers";

export async function GET() {
  return integrationStatus("sampserver");
}
export async function DELETE() {
  return disconnectIntegration("sampserver");
}
export async function PATCH() {
  return toggleIntegrationVisibility("sampserver");
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const host = String(body.host || "").trim().slice(0, 300);
  if (!host) return NextResponse.json({ success: false, error: "Enter a server address." }, { status: 400 });

  const result = await lookupSampServer(host);
  if (!result) return NextResponse.json({ success: false, error: "That address isn't valid. Use host or host:port, e.g. play.server.ro:7777." }, { status: 400 });

  await prisma.integration.upsert({
    where: { userId_type: { userId: user.id, type: "sampserver" } },
    create: { userId: user.id, type: "sampserver", visible: true, data: JSON.stringify(result) },
    update: { visible: true, data: JSON.stringify(result) },
  });

  return NextResponse.json({
    success: true,
    data: result,
    message: result.online ? undefined : "Saved — the server didn't answer right now, so it shows as offline until it's back.",
  });
}
