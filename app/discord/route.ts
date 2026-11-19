import { NextResponse } from "next/server";
import { DISCORD_INVITE_TARGET } from "@/lib/discord-invite";

// Read at request time so a DISCORD_INVITE_URL change only needs a restart, not a rebuild.
export const dynamic = "force-dynamic";

// Temporary (302) on purpose: browsers don't cache it forever, so the invite can change later.
export function GET() {
  return NextResponse.redirect(DISCORD_INVITE_TARGET, 302);
}
