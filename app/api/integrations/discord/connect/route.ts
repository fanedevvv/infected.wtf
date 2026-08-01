import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireUser } from "@/lib/auth-helpers";
import { getDiscordAuthorizeUrl } from "@/lib/discord";

export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.redirect(`${process.env.SITE_URL}/login`);
  }
  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(getDiscordAuthorizeUrl(state));
  res.cookies.set("discord_oauth_state", state, { httpOnly: true, maxAge: 600, path: "/" });
  return res;
}
