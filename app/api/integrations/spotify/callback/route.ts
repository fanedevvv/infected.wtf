import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { exchangeSpotifyCode, saveSpotifyAuthAndSnapshot } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const siteUrl = (process.env.SITE_URL || "https://infected.wtf").replace(/\/$/, "");
  const fail = (reason: string) => NextResponse.redirect(`${siteUrl}/dashboard?page=integrations&error=${reason}`);

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${siteUrl}/login`);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("spotify_oauth_state")?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return fail("spotify_invalid_state");
  }

  try {
    const token = await exchangeSpotifyCode(code);
    await saveSpotifyAuthAndSnapshot({
      userId: user.id,
      accessToken: token.access_token,
      refreshToken: token.refresh_token || "",
      expiresIn: token.expires_in,
    });

    const res = NextResponse.redirect(`${siteUrl}/dashboard?page=integrations&connected=spotify`);
    res.cookies.delete("spotify_oauth_state");
    return res;
  } catch (error) {
    console.error("[spotify oauth]", error);
    return fail("spotify_oauth_failed");
  }
}
