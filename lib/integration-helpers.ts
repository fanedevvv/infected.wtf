import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { getCurrentUser } from "./auth-helpers";

export async function integrationStatus(type: string) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await prisma.integration.findUnique({ where: { userId_type: { userId: user.id, type } } });
  return NextResponse.json({ integration: row ? { data: row.data, visible: row.visible } : null });
}

export async function disconnectIntegration(type: string) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.integration.deleteMany({ where: { userId: user.id, type } });
  return NextResponse.json({ success: true });
}

export async function toggleIntegrationVisibility(type: string) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const row = await prisma.integration.findUnique({ where: { userId_type: { userId: user.id, type } } });
  if (!row) return NextResponse.json({ success: false, error: "Integration not found." });
  const newVal = !row.visible;
  await prisma.integration.update({ where: { id: row.id }, data: { visible: newVal } });
  return NextResponse.json({ success: true, visible: newVal });
}
