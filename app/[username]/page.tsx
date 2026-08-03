import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getProfileBadges } from "@/lib/badges";
import { recordProfileView } from "@/lib/views";
import { getCurrentUser } from "@/lib/auth-helpers";
import ProfileView from "@/components/ProfileView";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    include: { profile: true, socialLinks: { orderBy: { displayOrder: "asc" } } },
  });

  if (!user || !user.profile) notFound();
  if (user.banned) notFound();

  const viewer = await getCurrentUser();
  const isOwner = viewer?.id === user.id;

  if (!isOwner) {
    const h = await headers();
    const ip = (h.get("x-forwarded-for") || h.get("cf-connecting-ip") || "0.0.0.0").split(",")[0].trim();
    const ua = h.get("user-agent") || "";
    const country = h.get("cf-ipcountry") || "";
    recordProfileView(user.id, ip, ua, country).catch(() => {});
  }

  const badges = await getProfileBadges(user.id);
  const profile = user.profile;
  const isPremium = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());

  const integration = await prisma.integration.findFirst({ where: { userId: user.id, type: "discord" } });
  const discordInt = integration && integration.discordUserId && integration.visible ? integration : null;
  const discordServerInt = integration && integration.discordServerId && integration.discordServerVisible ? integration : null;

  const purchasedEffects = ((profile.purchasedEffects as string[] | null) ?? []) as string[];
  const activeEffects = (profile.activeEffects as Record<string, string> | null) ?? {};

  return (
    <ProfileView
      username={user.username}
      displayName={profile.displayName || user.username}
      bio={profile.bio}
      location={profile.location}
      avatar={profile.avatar}
      avatarShape={profile.avatarShape}
      avatarRing={profile.avatarRing as "none" | "normal" | "premium"}
      accentColor={profile.accentColor}
      backgroundType={profile.backgroundType}
      backgroundValue={profile.backgroundValue}
      isPremium={isPremium}
      particleEffect={profile.particleEffect}
      cursorTrail={profile.cursorTrail}
      typingEffect={profile.typingEffect}
      musicPath={profile.musicPath}
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
      purchasedEffects={purchasedEffects}
      activeCursorEffect={activeEffects.cursor || ""}
      activeAvatarEffect={activeEffects.avatar || ""}
      activeBgEffect={activeEffects.bg || ""}
    />
  );
}
