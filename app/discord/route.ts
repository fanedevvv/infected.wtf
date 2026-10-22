import { NextResponse } from "next/server";
import { DISCORD_INVITE_TARGET } from "@/lib/discord-invite";

// Temporary (302) on purpose: browsers don't cache it forever, so the invite can change later.
export function GET() {
  return NextResponse.redirect(DISCORD_INVITE_TARGET, 302);
}
