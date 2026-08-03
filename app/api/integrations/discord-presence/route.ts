import { NextRequest, NextResponse } from "next/server";

const OFFLINE = { success: true, data: { status: "offline", activities: [] } };

export async function POST(req: NextRequest) {
  const body = await req.formData().catch(() => null);
  const discordId = String(body?.get("discord_id") || "").trim();
  if (!/^\d{17,20}$/.test(discordId)) {
    return NextResponse.json({ success: false, error: "Invalid Discord ID." });
  }

  const botUrl = process.env.DISCORD_BOT_URL;
  const apiKey = process.env.DISCORD_BOT_API_KEY || "";
  if (!botUrl) return NextResponse.json(OFFLINE);

  try {
    const res = await fetch(`${botUrl.replace(/\/$/, "")}/presence/${discordId}`, {
      headers: { "X-Api-Key": apiKey, "User-Agent": "BioLink/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (!data || !data.success) return NextResponse.json(OFFLINE);
    return NextResponse.json({ success: true, data: data.data });
  } catch {
    return NextResponse.json(OFFLINE);
  }
}
