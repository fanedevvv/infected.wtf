import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { getActiveProfileId } from "@/lib/active-profile";
import { EMBED_COLOR_MODES } from "@/lib/social-embed";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const activeProfileId = await getActiveProfileId(user.id);
  const profile = await prisma.profile.findUnique({
    where: { id: activeProfileId },
    select: {
      socialEmbedEnabled: true, socialEmbedTitle: true, socialEmbedDescription: true,
      socialEmbedColorMode: true, socialEmbedColorCustom: true, socialEmbedImage: true,
    },
  });
  if (!profile) return NextResponse.json({ success: false, error: "Profile not found." }, { status: 404 });
  return NextResponse.json({ success: true, embed: profile });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const isPremium = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());

  const body = await req.json().catch(() => ({}));
  const enabled = !!body.enabled;
  if (enabled && !isPremium) return NextResponse.json({ success: false, error: "Custom social previews are an Infected Plus feature." }, { status: 403 });

  const title = String(body.title || "").trim().slice(0, 100);
  const description = String(body.description || "").trim().slice(0, 300);
  let colorMode = String(body.colorMode || "page").trim();
  if (!EMBED_COLOR_MODES.includes(colorMode as (typeof EMBED_COLOR_MODES)[number])) colorMode = "page";
  const colorCustomRaw = String(body.colorCustom || "").trim();
  const colorCustom = /^#[0-9a-fA-F]{6}$/.test(colorCustomRaw) ? colorCustomRaw : null;

  const activeProfileId = await getActiveProfileId(user.id);
  await prisma.profile.updateMany({
    where: { id: activeProfileId },
    data: {
      socialEmbedEnabled: enabled,
      socialEmbedTitle: title || null,
      socialEmbedDescription: description || null,
      socialEmbedColorMode: colorMode,
      socialEmbedColorCustom: colorCustom,
    },
  });

  return NextResponse.json({ success: true });
}
