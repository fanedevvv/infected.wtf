import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { createLinkToken } from "@/lib/link-token";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.SITE_URL || "https://infected.wtf"));

  const siteUrl = (process.env.SITE_URL || "https://infected.wtf").replace(/\/$/, "");
  // The token lets the callback finish even in a browser without our session (e.g. a different app's webview).
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

  return NextResponse.redirect(loginUrl);
}
