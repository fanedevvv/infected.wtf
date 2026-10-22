import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJsonObject } from "@/lib/json-array";
import { getAppIcon, getDiscordProfile } from "@/lib/discord-profile";

type Activity = {
  name: string;
  type: number;
  details: string | null;
  state: string | null;
  url?: string | null;
  applicationId?: string | null;
  start?: number | null;
  end?: number | null;
  largeImage?: string | null;
  largeText?: string | null;
  smallImage?: string | null;
  smallText?: string | null;
  emoji?: { name: string; url: string | null } | null;
};

async function fetchPresence(discordId: string) {
  const botUrl = process.env.DISCORD_BOT_URL;
  if (!botUrl) return null;
  try {
    const res = await fetch(`${botUrl.replace(/\/$/, "")}/presence/${discordId}`, {
      headers: { "X-Api-Key": process.env.DISCORD_BOT_API_KEY || "", "User-Agent": "BioLink/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return data?.success ? (data.data as { status: string; activities: Activity[]; clientStatus?: Record<string, string> | null }) : null;
  } catch {
    return null;
  }
}

// Live presence from the bot + the full public profile, for the Discord card on profile pages.
export async function POST(req: NextRequest) {
  const body = await req.formData().catch(() => null);
  const discordId = String(body?.get("discord_id") || "").trim();
  if (!/^\d{17,20}$/.test(discordId)) {
    return NextResponse.json({ success: false, error: "Invalid Discord ID." });
  }

  const integration = await prisma.integration.findFirst({ where: { type: "discord", discordUserId: discordId }, select: { data: true } });
  const premiumType = Number(parseJsonObject<{ premiumType?: number }>(integration?.data)?.premiumType) || 0;

  const [presence, profile] = await Promise.all([fetchPresence(discordId), getDiscordProfile(discordId, premiumType)]);
  const activities = await Promise.all(
    (presence?.activities || []).map(async (a) => ({
      ...a,
      // Games often don't send artwork; fall back to the application's own icon.
      largeImage: a.largeImage || (a.applicationId && a.type === 0 ? await getAppIcon(a.applicationId) : null),
    })),
  );

  return NextResponse.json({
    success: true,
    data: { status: presence?.status || "offline", clientStatus: presence?.clientStatus || null, activities, profile },
  });
}
