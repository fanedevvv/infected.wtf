import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { integrationStatus, disconnectIntegration, toggleIntegrationVisibility } from "@/lib/integration-helpers";

const REGIONS = ["NA", "EU", "AP", "KR", "BR", "LATAM"];

export async function GET() {
  return integrationStatus("valorant");
}
export async function DELETE() {
  return disconnectIntegration("valorant");
}
export async function PATCH() {
  return toggleIntegrationVisibility("valorant");
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const riotId = String(body.riotId || "").trim().slice(0, 20);
  const tagLine = String(body.tagLine || "").trim().replace(/^#/, "").slice(0, 10);
  let region = String(body.region || "NA").trim().toUpperCase();
  if (!REGIONS.includes(region)) region = "NA";

  if (!riotId || !tagLine) {
    return NextResponse.json({ success: false, error: "Enter your Riot ID and tag (Name#Tag)." }, { status: 400 });
  }

  const result = { riotId, tagLine, region };
  await prisma.integration.upsert({
    where: { userId_type: { userId: user.id, type: "valorant" } },
    create: { userId: user.id, type: "valorant", visible: true, data: JSON.stringify(result) },
    update: { visible: true, data: JSON.stringify(result) },
  });

  return NextResponse.json({ success: true, data: result });
}
