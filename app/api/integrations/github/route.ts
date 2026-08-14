import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { lookupGithub } from "@/lib/game-lookup";
import { integrationStatus, disconnectIntegration, toggleIntegrationVisibility } from "@/lib/integration-helpers";

export async function GET() {
  return integrationStatus("github");
}
export async function DELETE() {
  return disconnectIntegration("github");
}
export async function PATCH() {
  return toggleIntegrationVisibility("github");
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  if (!username) return NextResponse.json({ success: false, error: "Enter a GitHub username." }, { status: 400 });

  const result = await lookupGithub(username);
  if (!result) return NextResponse.json({ success: false, error: "GitHub user not found." }, { status: 400 });

  await prisma.integration.upsert({
    where: { userId_type: { userId: user.id, type: "github" } },
    create: { userId: user.id, type: "github", visible: true, data: JSON.stringify(result) },
    update: { visible: true, data: JSON.stringify(result) },
  });

  return NextResponse.json({ success: true, data: result });
}
