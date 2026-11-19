import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { syncDiscordRoles } from "@/lib/discord-sync";

// "Sync roles" button: makes the user's Discord roles match their site grades right now.
// Light per-user cooldown so the button can't be used to hammer the bot.
const lastSync = new Map<number, number>();
const COOLDOWN_MS = 10_000;

export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const wait = (lastSync.get(user.id) ?? 0) + COOLDOWN_MS - Date.now();
  if (wait > 0) return NextResponse.json({ success: false, error: `Wait ${Math.ceil(wait / 1000)}s before syncing again.` }, { status: 429 });
  lastSync.set(user.id, Date.now());

  const r = await syncDiscordRoles(user.id);
  if (!r.success) return NextResponse.json({ success: false, error: r.error || "Sync failed." }, { status: 400 });
  if (!r.inGuild) return NextResponse.json({ success: false, notInGuild: true, error: "Join the INFECTED.WTF Discord server first, then sync again." }, { status: 400 });
  const changed = (r.added ?? 0) + (r.removed ?? 0);
  return NextResponse.json({
    success: true,
    added: r.added ?? 0,
    removed: r.removed ?? 0,
    message: changed ? `Roles synced — ${r.added} added, ${r.removed} removed.` : "Your Discord roles are already up to date.",
  });
}
