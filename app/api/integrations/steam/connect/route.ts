import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { createLinkToken } from "@/lib/link-token";

const STEAM_ANDROID_PACKAGE = "com.valvesoftware.android.steam.community";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.SITE_URL || "https://infected.wtf"));

  const siteUrl = (process.env.SITE_URL || "https://infected.wtf").replace(/\/$/, "");
  // The token lets the callback finish even inside the Steam app, where our session cookie doesn't exist.
  const returnTo = `${siteUrl}/api/integrations/steam/callback?lt=${createLinkToken(user.id, "steam")}`;

  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": siteUrl,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  const loginUrl = `https://steamcommunity.com/openid/login?${params.toString()}`;

  // On Android, hand the login to the Steam app (already signed in, so it's one tap); Chrome falls back to
  // the normal web login when the app isn't installed.
  if (/Android/i.test(req.headers.get("user-agent") || "")) {
    const u = new URL(loginUrl);
    return NextResponse.redirect(`intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=${STEAM_ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(loginUrl)};end`);
  }
  return NextResponse.redirect(loginUrl);
}
