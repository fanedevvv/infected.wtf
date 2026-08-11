import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getProfileBadges } from "@/lib/badges";
import { recordProfileView } from "@/lib/views";
import { getCurrentUser } from "@/lib/auth-helpers";
import ProfileView from "@/components/ProfileView";
import { GameIntegration } from "@/components/GameIntegrationCards";
import { lookupMcServer } from "@/lib/game-lookup";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username: slug } = await params;

  const profile = await prisma.profile.findUnique({
    where: { slug },
    include: { user: { include: { socialLinks: { orderBy: { displayOrder: "asc" } } } } },
  });

  if (!profile) notFound();
  const user = profile.user;
  if (user.banned) notFound();

  const viewer = await getCurrentUser();
  const isOwner = viewer?.id === user.id;

  if (!isOwner) {
    const h = await headers();
    const ip = (h.get("x-forwarded-for") || h.get("cf-connecting-ip") || "0.0.0.0").split(",")[0].trim();
    const ua = h.get("user-agent") || "";
    const country = h.get("cf-ipcountry") || "";
    recordProfileView(profile.id, user.id, ip, ua, country).catch(() => {});
  }

  const badges = await getProfileBadges(profile.id);
  const isPremium = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());

  const integration = await prisma.integration.findFirst({ where: { userId: user.id, type: "discord" } });
  const discordInt = integration && integration.discordUserId && integration.visible ? integration : null;
  const discordServerInt = integration && integration.discordServerId && integration.discordServerVisible ? integration : null;

  const gameRows = await prisma.integration.findMany({
    where: { userId: user.id, visible: true, type: { in: ["steam", "roblox", "minecraft", "mcserver", "valorant", "twitch"] } },
  });
  const gameIntegrations: GameIntegration[] = [];
  for (const row of gameRows) {
    if (!row.data) continue;
    if (row.type === "mcserver") {
      const host = (row.data as { host?: string }).host;
      if (!host) continue;
      const live = await lookupMcServer(host);
      gameIntegrations.push({ type: "mcserver", data: live || (row.data as GameIntegration["data"] as { host: string; online: boolean; playersOnline: number; playersMax: number; motd: string; icon: string }) });
    } else {
      gameIntegrations.push({ type: row.type, data: row.data } as GameIntegration);
    }
  }

  const purchasedEffects = ((profile.purchasedEffects as string[] | null) ?? []) as string[];
  const activeEffects = (profile.activeEffects as Record<string, string> | null) ?? {};

  let age: number | null = null;
  if (profile.birthDate) {
    const now = new Date();
    age = now.getUTCFullYear() - profile.birthDate.getUTCFullYear();
    const hadBirthdayThisYear =
      now.getUTCMonth() > profile.birthDate.getUTCMonth() ||
      (now.getUTCMonth() === profile.birthDate.getUTCMonth() && now.getUTCDate() >= profile.birthDate.getUTCDate());
    if (!hadBirthdayThisYear) age -= 1;
  }

  const [likeCount, likedByViewer] = await Promise.all([
    prisma.profileLike.count({ where: { profileUserId: user.id } }),
    viewer ? prisma.profileLike.findUnique({ where: { profileUserId_likerUserId: { profileUserId: user.id, likerUserId: viewer.id } } }) : null,
  ]);

  return (
    <ProfileView
      username={profile.slug}
      displayName={profile.displayName || user.username}
      bio={profile.bio}
      location={profile.location}
      job={profile.job}
      age={age}
      avatar={profile.avatar}
      banner={profile.banner}
      avatarShape={profile.avatarShape}
      avatarRing={profile.avatarRing as "none" | "normal" | "premium"}
      activeDecoration={profile.activeDecoration}
      accentColor={profile.accentColor}
      backgroundColor={profile.backgroundColor}
      nameColor={profile.nameColor}
      bioColor={profile.bioColor}
      overlayColor={profile.overlayColor}
      backgroundType={profile.backgroundType}
      backgroundValue={profile.backgroundValue}
      isPremium={isPremium}
      particleEffect={profile.particleEffect}
      cursorTrail={profile.cursorTrail}
      nameEffect={profile.nameEffect}
      bioEffect={profile.bioEffect}
      musicTracks={(((profile.musicTracks as (string | null)[] | null) ?? []).filter(Boolean) as string[])}
      playlistStyle={profile.playlistStyle}
      cursorPath={profile.cursorPath}
      views={profile.views}
      createdAt={user.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
      isOwner={isOwner}
      socialLinks={user.socialLinks}
      badges={badges}
      discordInt={
        discordInt
          ? {
              discordUserId: discordInt.discordUserId!,
              discordUsername: discordInt.discordUsername || "",
              discordGlobalName: discordInt.discordGlobalName,
              discordAvatar: discordInt.discordAvatar,
            }
          : null
      }
      discordServerInt={
        discordServerInt
          ? {
              invite: discordServerInt.discordServerInvite || "",
              serverName: discordServerInt.discordServerName || "Discord Server",
              serverIcon: discordServerInt.discordServerIcon,
              serverId: discordServerInt.discordServerId || "",
              online: discordServerInt.discordServerOnline || 0,
              total: discordServerInt.discordServerTotal || 0,
            }
          : null
      }
      gameIntegrations={gameIntegrations}
      layoutTemplate={profile.layoutTemplate}
      purchasedEffects={purchasedEffects}
      activeCursorEffect={activeEffects.cursor || ""}
      activeAvatarEffect={activeEffects.avatar || ""}
      activeBgEffect={activeEffects.bg || ""}
      likeCount={likeCount}
      likedByViewer={!!likedByViewer}
      viewerLoggedIn={!!viewer}
    />
  );
}
