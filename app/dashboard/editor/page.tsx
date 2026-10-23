import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/active-profile";
import { parseStringArray } from "@/lib/json-array";
import EffectsPage from "../effects/page";
import BadgesPage from "../badges/page";
import IntegrationsPage from "../integrations/page";
import LinksPage from "../links/page";
import ProfileEditor from "./ProfileEditor";
import { EDITOR_TILES, type EditorTile } from "./tiles";

// Tiles backed by existing server-rendered dashboard pages; only the active one is rendered per request.
async function serverPanel(tile: EditorTile, params: { error?: string; connected?: string }) {
  switch (tile) {
    case "look":
      return <EffectsPage section="avatar" />;
    case "background":
      return <EffectsPage section="bg" />;
    case "effects":
      return (
        <>
          <EffectsPage section="text" />
          <EffectsPage section="cursor" />
        </>
      );
    case "links":
      return <LinksPage />;
    case "widgets":
      return <IntegrationsPage searchParams={Promise.resolve(params)} />;
    case "badges":
      return <BadgesPage />;
    default:
      return null;
  }
}

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ tile?: string; error?: string; connected?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeProfileId = await getActiveProfileId(user.id);
  const profile = await prisma.profile.findUnique({ where: { id: activeProfileId } });
  if (!profile) redirect("/dashboard");

  const params = await searchParams;
  const tile: EditorTile = EDITOR_TILES.some((t) => t.id === params.tile) ? (params.tile as EditorTile) : "profile";
  const isPremium = !!(user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date()));

  return (
    <ProfileEditor
      tile={tile}
      slug={profile.slug}
      views={profile.views ?? 0}
      showWeather={profile.showWeather}
      showClock={profile.showClock}
      clock24h={profile.clock24h}
      panel={await serverPanel(tile, { error: params.error, connected: params.connected })}
      formProps={{
        tab: "",
        sub: "",
        avatar: profile.avatar,
        banner: profile.banner,
        backgroundType: profile.backgroundType || "particles",
        backgroundValue: profile.backgroundValue || "#050507",
        musicTracks: [parseStringArray(profile.musicTracks)[0] ?? null],
        musicTrackTitle: profile.musicTrackTitle || "",
        musicTrackArtist: profile.musicTrackArtist || "",
        musicArtworkUrl: profile.musicArtworkUrl || "",
        musicLyricsSynced: profile.musicLyricsSynced || "",
        musicShowLyrics: profile.musicShowLyrics,
        playlistStyle: profile.playlistStyle,
        layoutTemplate: profile.layoutTemplate,
        isPremium,
        cursorPath: profile.cursorPath,
        displayName: profile.displayName || "",
        location: profile.location || "",
        job: profile.job || "",
        birthDate: profile.birthDate ? profile.birthDate.toISOString().slice(0, 10) : "",
        bio: profile.bio || "",
        profileFont: profile.profileFont || "Syne",
        profileOpacity: profile.profileOpacity ?? 100,
        profileBlur: profile.profileBlur ?? 0,
        accentColor: profile.accentColor,
        backgroundColor: profile.backgroundColor,
        nameColor: profile.nameColor,
        bioColor: profile.bioColor,
        overlayColor: profile.overlayColor,
      }}
    />
  );
}
