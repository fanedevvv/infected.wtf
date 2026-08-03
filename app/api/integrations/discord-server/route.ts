import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

function extractInviteCode(invite: string): string | null {
  const m = invite.match(/discord\.gg\/([a-zA-Z0-9-]+)$/);
  return m ? m[1] : null;
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  }

  const body = await req.json();
  const invite = String(body.invite || "").trim();
  if (!/^https?:\/\/discord\.gg\/[a-zA-Z0-9-]+$/.test(invite)) {
    return NextResponse.json({ success: false, error: "Invalid Discord invite link. Use the format: https://discord.gg/your-code" });
  }
  const code = extractInviteCode(invite);
  if (!code) return NextResponse.json({ success: false, error: "Invalid Discord invite link." });

  let data;
  try {
    const res = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true&with_expiration=true`, {
      headers: { "User-Agent": "BioLink/1.0" },
    });
    if (!res.ok) throw new Error("bad status");
    data = await res.json();
  } catch {
    return NextResponse.json({ success: false, error: "Could not fetch server info. Make sure the invite link is valid and not expired." });
  }

  const guild = data?.guild;
  if (!guild || !guild.id) {
    return NextResponse.json({ success: false, error: "Could not retrieve server data from Discord." });
  }

  const serverId = String(guild.id);
  const serverName = guild.name || "Unknown";
  const serverIcon = guild.icon || null;
  const totalMembers = data.approximate_member_count ?? 0;
  const onlineCount = data.approximate_presence_count ?? 0;

  await prisma.integration.upsert({
    where: { userId_type: { userId: user.id, type: "discord" } },
    create: {
      userId: user.id,
      type: "discord",
      discordServerInvite: invite,
      discordServerId: serverId,
      discordServerName: serverName,
      discordServerIcon: serverIcon,
      discordServerOnline: onlineCount,
      discordServerTotal: totalMembers,
      discordServerVisible: true,
      discordServerUpdated: new Date(),
    },
    update: {
      discordServerInvite: invite,
      discordServerId: serverId,
      discordServerName: serverName,
      discordServerIcon: serverIcon,
      discordServerOnline: onlineCount,
      discordServerTotal: totalMembers,
      discordServerVisible: true,
      discordServerUpdated: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    message: "Discord server connected!",
    server_name: serverName,
    server_icon: serverIcon,
    server_id: serverId,
    online: onlineCount,
    total: totalMembers,
  });
}

export async function PATCH(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  }

  const body = await req.json();
  const action = String(body.action || "toggle");

  const row = await prisma.integration.findUnique({ where: { userId_type: { userId: user.id, type: "discord" } } });
  if (!row || !row.discordServerInvite) return NextResponse.json({ success: false, error: "No server linked." });

  if (action === "toggle") {
    const newVal = !row.discordServerVisible;
    await prisma.integration.update({ where: { id: row.id }, data: { discordServerVisible: newVal } });
    return NextResponse.json({ success: true, message: newVal ? "Discord server visible on profile." : "Discord server hidden from profile." });
  }

  if (action === "refresh") {
    const code = extractInviteCode(row.discordServerInvite);
    if (!code) return NextResponse.json({ success: false, error: "Invalid invite stored." });
    try {
      const res = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`, {
        headers: { "User-Agent": "BioLink/1.0" },
      });
      if (!res.ok) throw new Error("bad status");
      const data = await res.json();
      const total = data.approximate_member_count ?? 0;
      const online = data.approximate_presence_count ?? 0;
      await prisma.integration.update({ where: { id: row.id }, data: { discordServerOnline: online, discordServerTotal: total, discordServerUpdated: new Date() } });
      return NextResponse.json({ success: true, message: "Refreshed.", online, total });
    } catch {
      return NextResponse.json({ success: false, error: "Could not reach Discord API." });
    }
  }

  return NextResponse.json({ success: false, error: "Unknown action." });
}

export async function DELETE() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthenticated." }, { status: 401 });
  }

  const row = await prisma.integration.findUnique({ where: { userId_type: { userId: user.id, type: "discord" } } });
  if (!row) return NextResponse.json({ success: false, error: "Integration not found." });

  if (row.discordUserId) {
    await prisma.integration.update({
      where: { id: row.id },
      data: {
        discordServerInvite: null,
        discordServerId: null,
        discordServerName: null,
        discordServerIcon: null,
        discordServerOnline: null,
        discordServerTotal: null,
        discordServerVisible: true,
        discordServerUpdated: null,
      },
    });
  } else {
    await prisma.integration.delete({ where: { id: row.id } });
  }

  return NextResponse.json({ success: true, message: "Discord server removed." });
}
