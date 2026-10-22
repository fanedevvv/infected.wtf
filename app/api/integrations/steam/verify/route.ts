import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { fetchSteamProfile, linkSteam, parseSteamRef, steamVerifyCode } from "@/lib/steam";

const bad = (error: string) => NextResponse.json({ success: false, error }, { status: 400 });

// Connect Steam without logging in: the user proves ownership by putting a code in their profile summary.
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  if (body.action === "start") {
    const ref = parseSteamRef(String(body.profile || ""));
    if (!ref) return bad("Paste your Steam profile link, e.g. steamcommunity.com/id/yourname");
    const profile = await fetchSteamProfile(ref);
    if (!profile) return bad("We couldn't find that Steam profile.");
    return NextResponse.json({
      success: true,
      steamId64: profile.steamId64,
      personaName: profile.personaName,
      avatarUrl: profile.avatarUrl,
      isPublic: profile.isPublic,
      code: steamVerifyCode(me.id, profile.steamId64),
    });
  }

  if (body.action === "verify") {
    const steamId64 = String(body.steamId64 || "");
    if (!/^\d{17}$/.test(steamId64)) return bad("Start again with your profile link.");
    const profile = await fetchSteamProfile({ steamId64 });
    if (!profile) return bad("Steam didn't answer — try again in a moment.");
    if (!profile.isPublic) return bad("Your Steam profile is private. Set it to Public, then verify again.");
    const code = steamVerifyCode(me.id, steamId64);
    if (!profile.summary.toUpperCase().includes(code)) {
      return bad(`We can't see ${code} in your profile summary yet. Save it on Steam, wait a few seconds and try again.`);
    }
    const result = await linkSteam(me.id, profile);
    if (result === "already_linked") return bad("That Steam account is already linked to another infected.wtf user.");
    return NextResponse.json({
      success: true,
      data: { steamId64, personaName: profile.personaName, avatarUrl: profile.avatarUrl, profileUrl: `https://steamcommunity.com/profiles/${steamId64}` },
    });
  }

  return bad("Unknown action.");
}
