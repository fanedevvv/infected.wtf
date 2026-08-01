import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

const ALLOWED_BG_TYPES = ["color", "gradient", "image", "video", "particles"];
const ALLOWED_SHAPES = ["square", "soft", "rounded", "circle", "heart", "star", "eye", "diamond", "egg", "sun"];

export async function PATCH(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.displayName === "string") data.displayName = body.displayName.slice(0, 100);
  if (typeof body.bio === "string") data.bio = body.bio.slice(0, 300);
  if (typeof body.location === "string") data.location = body.location.slice(0, 100);
  if (typeof body.backgroundType === "string" && ALLOWED_BG_TYPES.includes(body.backgroundType))
    data.backgroundType = body.backgroundType;
  if (typeof body.backgroundValue === "string") data.backgroundValue = body.backgroundValue.slice(0, 500);
  if (typeof body.accentColor === "string" && /^#[0-9a-fA-F]{6}$/.test(body.accentColor))
    data.accentColor = body.accentColor;
  if (typeof body.secondaryColor === "string" && /^#[0-9a-fA-F]{6}$/.test(body.secondaryColor))
    data.secondaryColor = body.secondaryColor;
  if (typeof body.profileFont === "string") data.profileFont = body.profileFont.slice(0, 50);
  if (typeof body.profileOpacity === "number") data.profileOpacity = Math.max(0, Math.min(100, body.profileOpacity));
  if (typeof body.profileBlur === "number") data.profileBlur = Math.max(0, Math.min(20, body.profileBlur));
  if (typeof body.cursorTrail === "boolean") data.cursorTrail = body.cursorTrail;
  if (typeof body.particleEffect === "boolean") data.particleEffect = body.particleEffect;
  if (typeof body.typingEffect === "boolean") data.typingEffect = body.typingEffect;
  if (typeof body.avatarShape === "string" && ALLOWED_SHAPES.includes(body.avatarShape))
    data.avatarShape = body.avatarShape;

  const profile = await prisma.profile.update({ where: { userId: user.id }, data });
  return NextResponse.json({ success: true, profile });
}
