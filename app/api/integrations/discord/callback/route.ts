import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { exchangeDiscordCode, getDiscordUser } from "@/lib/discord";

export async function GET(req: NextRequest) {
  const siteUrl = process.env.SITE_URL || "";
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${siteUrl}/login`);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("discord_oauth_state")?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${siteUrl}/dashboard?page=integrations&error=invalid_state`);
  }

  try {
    const token = await exchangeDiscordCode(code);
    const discordUser = await getDiscordUser(token.access_token);

    const existingOnOther = await prisma.integration.findFirst({
      where: { type: "discord", discordUserId: discordUser.id, NOT: { userId: user.id } },
    });
    if (existingOnOther) {
      return NextResponse.redirect(`${siteUrl}/dashboard?page=integrations&error=already_linked`);
    }

    await prisma.integration.upsert({
      where: { userId_type: { userId: user.id, type: "discord" } },
      create: {
        userId: user.id,
        type: "discord",
        discordUserId: discordUser.id,
        discordUsername: discordUser.username,
        discordGlobalName: discordUser.global_name,
        discordAvatar: discordUser.avatar,
      },
      update: {
        discordUserId: discordUser.id,
        discordUsername: discordUser.username,
        discordGlobalName: discordUser.global_name,
        discordAvatar: discordUser.avatar,
      },
    });

    const profile = await prisma.profile.findFirst({ where: { userId: user.id , isPrimary: true } });
    const badges = new Set((profile?.badges as string[] | null) ?? []);
    if (!badges.has("discord")) {
      badges.add("discord");
      await prisma.profile.updateMany({ where: { userId: user.id , isPrimary: true }, data: { badges: Array.from(badges) } });
    }

    const res = NextResponse.redirect(`${siteUrl}/dashboard?page=integrations&connected=1`);
    res.cookies.delete("discord_oauth_state");
    return res;
  } catch (e) {
    console.error("[discord oauth]", e);
    return NextResponse.redirect(`${siteUrl}/dashboard?page=integrations&error=oauth_failed`);
  }
}
