import type { Metadata, Viewport } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getProfileBadges } from "@/lib/badges";
import { recordProfileView } from "@/lib/views";
import { getCurrentUser } from "@/lib/auth-helpers";
import ProfileView from "@/components/ProfileView";
import { GameIntegration } from "@/components/GameIntegrationCards";
import { lookupMcServer } from "@/lib/game-lookup";
import { refreshSpotifyIntegrationForUser } from "@/lib/spotify";
import { parseStringArray, parseJsonObject, parseNumberArray } from "@/lib/json-array";
import { pickThemeSnapshot } from "@/lib/theme-snapshot";
import { getWeatherForLocation } from "@/lib/weather";
import { applyEmbedVariables } from "@/lib/social-embed";
import Link from "next/link";

const DRAFT_STRING_FIELDS = ["displayName", "bio", "location", "job", "layoutTemplate", "playlistStyle"] as const;
const DRAFT_COLOR_FIELDS = ["accentColor", "backgroundColor", "nameColor", "bioColor", "overlayColor"] as const;

function parseEditorDraft(raw: string): Record<string, string> {
  try {
    const data = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const f of DRAFT_STRING_FIELDS) if (typeof data[f] === "string") out[f] = (data[f] as string).slice(0, 300);
    for (const f of DRAFT_COLOR_FIELDS) if (typeof data[f] === "string" && /^#[0-9a-fA-F]{6}$/.test(data[f] as string)) out[f] = data[f] as string;
    return out;
  } catch {
    return {};
  }
}

async function getEmbedProfile(slug: string) {
  const profile = await prisma.profile.findUnique({ where: { slug }, include: { user: { select: { username: true, banned: true } } } });
  return profile && !profile.user.banned ? profile : null;
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username: slug } = await params;
  const profile = await getEmbedProfile(slug);
  if (!profile) return {};

  const displayName = profile.displayName || profile.user.username;
  const vars = { username: profile.slug, displayName, bio: profile.bio || "", views: profile.views ?? 0 };
  const title = profile.socialEmbedEnabled && profile.socialEmbedTitle
    ? applyEmbedVariables(profile.socialEmbedTitle, vars)
    : displayName;
  const description = profile.socialEmbedEnabled && profile.socialEmbedDescription
    ? applyEmbedVariables(profile.socialEmbedDescription, vars)
    : profile.bio || `@${profile.slug} on infected.wtf`;
  const themeColor = profile.socialEmbedEnabled
    ? profile.socialEmbedColorMode === "none" ? undefined : profile.socialEmbedColorMode === "custom" ? profile.socialEmbedColorCustom || undefined : profile.accentColor
    : undefined;
  return {
    title: `${title} | INFECTED.WTF`,
    description,
    ...(themeColor ? { other: { "theme-color": themeColor } } : {}),
    openGraph: { type: "profile", siteName: "INFECTED.WTF", title, description, url: `/${profile.slug}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

// Discord uses theme-color for the embed's side bar.
export async function generateViewport({ params }: { params: Promise<{ username: string }> }): Promise<Viewport> {
  const { username: slug } = await params;
  const profile = await getEmbedProfile(slug);
  return profile ? { themeColor: profile.accentColor } : {};
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ previewTheme?: string; draft?: string; embed?: string }>;
}) {
  const { username: slug } = await params;
  const { previewTheme, draft, embed } = await searchParams;

  const profile = await prisma.profile.findUnique({
    where: { slug },
    include: { user: { include: { socialLinks: { orderBy: { displayOrder: "asc" } } } } },
  });

  if (!profile) {
    // Aliases are extra handles that point at a real page.
    const alias = await prisma.profileAlias.findUnique({ where: { alias: slug.toLowerCase() }, select: { profile: { select: { slug: true } } } });
    if (alias) redirect(`/${alias.profile.slug}`);
    notFound();
  }
  const user = profile.user;
  if (user.banned) notFound();

  const requestHost = (await headers()).get("host")?.split(":")[0].toLowerCase() || "";
  const isPrimaryHost = !requestHost || requestHost === "infected.wtf" || requestHost === "www.infected.wtf" || requestHost === "localhost";
  if (!isPrimaryHost) {
    const domain = await prisma.siteDomain.findUnique({ where: { hostname: requestHost } });
    const allowed = domain ? await prisma.profileDomain.findUnique({ where: { profileId_domainId: { profileId: profile.id, domainId: domain.id } } }) : null;
    if (!allowed) notFound();
  }

  const viewer = await getCurrentUser();
  const isOwner = viewer?.id === user.id;

  // Owners can try a marketplace theme on their own page via ?previewTheme=<id> without applying it.
  const previewThemeId = previewTheme ? parseInt(previewTheme, 10) : NaN;
  const themePreview = isOwner && viewer && !Number.isNaN(previewThemeId)
    ? await prisma.theme.findUnique({ where: { id: previewThemeId } })
    : null;
  const canPreview = !!themePreview && (themePreview.active || themePreview.creatorId === viewer?.id || parseNumberArray(viewer?.purchasedThemes).includes(themePreview.id));
  const themed = canPreview ? ({ ...profile, ...pickThemeSnapshot(themePreview!) } as typeof profile) : profile;
  // The dashboard editor previews unsaved changes by passing them here (owner only, whitelisted fields).
  const look = isOwner && draft ? ({ ...themed, ...parseEditorDraft(draft) } as typeof profile) : themed;

  if (!isOwner) {
    const h = await headers();
    const ip = (h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0].trim() || "0.0.0.0");
    const ua = h.get("user-agent") || "";
    const country = h.get("cf-ipcountry") || "";
    recordProfileView(profile.id, user.id, ip, ua, country).catch(() => {});
  }

  const badges = await getProfileBadges(profile.id);
  const isPremium = !!(user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date()));

  const integration = await prisma.integration.findFirst({ where: { userId: user.id, type: "discord" } });
  const discordInt = integration && integration.discordUserId && integration.visible ? integration : null;
  const discordServerInt = integration && integration.discordServerId && integration.discordServerVisible ? integration : null;

  const gameRows = await prisma.integration.findMany({
    where: { userId: user.id, visible: true, type: { in: ["steam", "roblox", "minecraft", "mcserver", "valorant", "twitch", "spotify", "github"] } },
  });
  const spotifySnapshot = gameRows.some((row) => row.type === "spotify")
    ? await refreshSpotifyIntegrationForUser(user.id).catch(() => null)
    : null;
  const gameIntegrations: GameIntegration[] = [];
  for (const row of gameRows) {
    const parsedData = parseJsonObject(row.data);
    if (!parsedData && row.type !== "spotify") continue;
    if (row.type === "mcserver") {
      const host = (parsedData as { host?: string } | null)?.host;
      if (!host) continue;
      const live = await lookupMcServer(host);
      gameIntegrations.push({ type: "mcserver", data: live || (parsedData as { host: string; online: boolean; playersOnline: number; playersMax: number; motd: string; icon: string }) });
    } else if (row.type === "spotify") {
      if (spotifySnapshot) gameIntegrations.push({ type: "spotify", data: spotifySnapshot });
    } else {
      gameIntegrations.push({ type: row.type, data: parsedData } as unknown as GameIntegration);
    }
  }

  const purchasedEffects = (parseStringArray(profile.purchasedEffects)) as string[];
  const activeEffects = (parseJsonObject<Record<string, string>>(profile.activeEffects) ?? {});

  let age: number | null = null;
  if (profile.birthDate) {
    const now = new Date();
    age = now.getUTCFullYear() - profile.birthDate.getUTCFullYear();
    const hadBirthdayThisYear =
      now.getUTCMonth() > profile.birthDate.getUTCMonth() ||
      (now.getUTCMonth() === profile.birthDate.getUTCMonth() && now.getUTCDate() >= profile.birthDate.getUTCDate());
    if (!hadBirthdayThisYear) age -= 1;
  }

  const [projects, skills, bestFriendRow] = await Promise.all([
    prisma.profileProject.findMany({ where: { profileId: profile.id, status: "approved" }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.profileSkill.findMany({ where: { profileId: profile.id }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }], take: 20 }),
    prisma.profileBestFriend.findUnique({
      where: { profileId: profile.id },
      select: { friend: { select: { slug: true, displayName: true, avatar: true, user: { select: { username: true, banned: true } } } } },
    }),
  ]);
  const bestFriend = bestFriendRow && !bestFriendRow.friend.user.banned
    ? { slug: bestFriendRow.friend.slug, displayName: bestFriendRow.friend.displayName || bestFriendRow.friend.user.username, avatar: bestFriendRow.friend.avatar }
    : null;

  const [likeCount, likedByViewer, dislikeCount, dislikedByViewer, weather] = await Promise.all([
    prisma.profileLike.count({ where: { profileUserId: user.id } }),
    viewer ? prisma.profileLike.findUnique({ where: { profileUserId_likerUserId: { profileUserId: user.id, likerUserId: viewer.id } } }) : null,
    prisma.profileDislike.count({ where: { profileUserId: user.id } }),
    viewer ? prisma.profileDislike.findUnique({ where: { profileUserId_dislikerUserId: { profileUserId: user.id, dislikerUserId: viewer.id } } }) : null,
    getWeatherForLocation(look.location),
  ]);

  return (
    <>
    {canPreview && embed !== "1" && (
      <div className="theme-preview-bar">
        <span>Previewing <b>{themePreview!.name}</b> on your profile — nothing is saved</span>
        <Link href="/dashboard?page=marketplace">Back to marketplace</Link>
        <Link href={`/${profile.slug}`}>Exit preview</Link>
      </div>
    )}
    <ProfileView
      username={profile.slug}
      displayName={look.displayName || user.username}
      bio={look.bio}
      location={look.location}
      job={look.job}
      age={age}
      avatar={profile.avatar}
      banner={profile.banner}
      avatarShape={look.avatarShape}
      avatarRing={look.avatarRing as "none" | "normal" | "premium"}
      activeDecoration={profile.activeDecoration}
      accentColor={look.accentColor}
      backgroundColor={look.backgroundColor}
      nameColor={look.nameColor}
      bioColor={look.bioColor}
      overlayColor={look.overlayColor}
      backgroundType={look.backgroundType}
      backgroundValue={look.backgroundValue ?? ""}
      isPremium={isPremium}
      particleEffect={!!look.particleEffect}
      cursorTrail={!!look.cursorTrail}
      nameEffect={look.nameEffect}
      bioEffect={look.bioEffect}
      musicTracks={embed === "1" && isOwner ? [] : parseStringArray(profile.musicTracks).filter(Boolean)}
      playlistStyle={look.playlistStyle}
      profileFont={look.profileFont || "Syne"}
      cursorPath={profile.cursorPath}
      views={profile.views ?? 0}
      createdAt={(user.createdAt ?? new Date()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
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
      projects={projects.map((pr) => ({ id: pr.id, title: pr.title, description: pr.description, url: pr.url, repoUrl: pr.repoUrl, technologies: pr.technologies, image: pr.image }))}
      skills={skills.map((sk) => ({ id: sk.id, name: sk.name, level: sk.level }))}
      bestFriend={bestFriend}
      layoutTemplate={look.layoutTemplate}
      purchasedEffects={purchasedEffects}
      activeCursorEffect={activeEffects.cursor || ""}
      activeAvatarEffect={activeEffects.avatar || ""}
      activeBgEffect={activeEffects.bg || ""}
      likeCount={likeCount}
      likedByViewer={!!likedByViewer}
      dislikeCount={dislikeCount}
      dislikedByViewer={!!dislikedByViewer}
      weather={weather}
      viewerLoggedIn={!!viewer}
      autoEnter={embed === "1" && isOwner}
    />
    </>
  );
}
