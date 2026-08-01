import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const link = await prisma.socialLink.findUnique({ where: { id: Number(id) } });
  if (!link || link.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.platform === "string") data.platform = body.platform.slice(0, 50);
  if (typeof body.url === "string") data.url = body.url.slice(0, 500);
  if (typeof body.displayOrder === "number") data.displayOrder = body.displayOrder;

  const updated = await prisma.socialLink.update({ where: { id: link.id }, data });
  return NextResponse.json({ success: true, link: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const link = await prisma.socialLink.findUnique({ where: { id: Number(id) } });
  if (!link || link.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.socialLink.delete({ where: { id: link.id } });
  return NextResponse.json({ success: true });
}
