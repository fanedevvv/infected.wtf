import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { refreshSpotifyIntegrationForUser, toSpotifyPublicData } from "@/lib/spotify";

function parseData(raw: unknown) {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.integration.findUnique({ where: { userId_type: { userId: user.id, type: "spotify" } } });
  if (!row) return NextResponse.json({ integration: null });

  const safeData = toSpotifyPublicData(parseData(row.data));
  return NextResponse.json({ integration: safeData ? { data: safeData, visible: row.visible } : null });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = String((body as { action?: string }).action || "refresh");
  if (action !== "refresh") return NextResponse.json({ success: false, error: "Unknown action." }, { status: 400 });

  try {
    const data = await refreshSpotifyIntegrationForUser(user.id, true);
    if (!data) return NextResponse.json({ success: false, error: "Spotify is not connected." }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[spotify refresh]", error);
    return NextResponse.json({ success: false, error: "Could not refresh Spotify data." }, { status: 500 });
  }
}

export async function PATCH() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const row = await prisma.integration.findUnique({ where: { userId_type: { userId: user.id, type: "spotify" } } });
  if (!row) return NextResponse.json({ success: false, error: "Integration not found." });

  const visible = !row.visible;
  await prisma.integration.update({ where: { id: row.id }, data: { visible } });
  return NextResponse.json({ success: true, visible });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  await prisma.integration.deleteMany({ where: { userId: user.id, type: "spotify" } });
  return NextResponse.json({ success: true });
}
