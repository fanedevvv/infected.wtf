import crypto from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.SITE_URL || "https://infected.wtf"));

  const clientId = process.env.SPOTIFY_CLIENT_ID || "";
  if (!clientId) {
    return NextResponse.redirect(new URL("/dashboard?page=integrations&error=spotify_missing_config", process.env.SITE_URL || "https://infected.wtf"));
  }

  const siteUrl = (process.env.SITE_URL || "https://infected.wtf").replace(/\/$/, "");
  const redirectUri = `${siteUrl}/api/integrations/spotify/callback`;
  const state = crypto.randomBytes(24).toString("hex");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
    scope: "user-read-currently-playing user-read-playback-state user-read-recently-played",
  });

  const res = NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
  res.cookies.set("spotify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}
