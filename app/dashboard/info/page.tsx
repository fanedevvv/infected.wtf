import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/active-profile";
import { parseStringArray } from "@/lib/json-array";
import ProfileInfoForm from "./ProfileInfoForm";
import { AppearanceTabBar, AppearanceSubNav, SubNavItem } from "./AppearanceNav";
import EffectsPage from "../effects/page";
import BadgesPage from "../badges/page";
import IntegrationsPage from "../integrations/page";
import { getT } from "@/lib/i18n/server";

const ICONS: Record<string, React.ReactNode> = {
  visuals: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>,
  audio: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>,
  profile: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  colors: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></svg>,
  fonts: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="7" x2="20" y2="7" /><line x1="9" y1="7" x2="9" y2="20" /><line x1="15" y1="7" x2="15" y2="20" /><line x1="6" y1="20" x2="12" y2="20" /></svg>,
  bg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>,
  avatar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 1 0-16 0" /></svg>,
  cursor: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l7.07 17 2.51-7.39L21 11.07z" /></svg>,
  template: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  effects: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
};

const SUBNAV: Record<string, SubNavItem[]> = {
  media: [
    { id: "visuals", label: "Visuals", icon: ICONS.visuals },
    { id: "audio", label: "Audio", icon: ICONS.audio },
  ],
  appearance: [
    { id: "profile", label: "Profile", icon: ICONS.profile },
    { id: "colors", label: "Colors", icon: ICONS.colors },
    { id: "avatar", label: "Avatar", icon: ICONS.avatar },
    { id: "fonts", label: "Fonts", icon: ICONS.fonts },
    { id: "cursor", label: "Cursor", icon: ICONS.cursor },
    { id: "bg", label: "Bg", icon: ICONS.bg },
  ],
  layout: [
    { id: "template", label: "Template", icon: ICONS.template },
    { id: "effects", label: "Effects", icon: ICONS.effects },
  ],
};

export default async function ProfileInfoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; sub?: string; error?: string; connected?: string }>;
}) {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeProfileId = await getActiveProfileId(user.id);
  const profile = await prisma.profile.findUnique({ where: { id: activeProfileId } });
  if (!profile) redirect("/dashboard");

  const isPremium = user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());
  const params = await searchParams;
  const tab = ["media", "appearance", "layout", "badges", "integrations"].includes(params.tab || "")
    ? params.tab!
    : "media";
  const subItems = SUBNAV[tab];
  const sub = subItems && subItems.some((s) => s.id === params.sub) ? params.sub! : subItems?.[0]?.id;

  return (
    <>
      <div className="section-header">
        <h2>{t("Appearance")}</h2>
        <p>{t("Customize how your profile looks")}</p>
      </div>

      <AppearanceTabBar activeTab={tab} />

      {subItems ? (
        <div className="appr-shell">
          <AppearanceSubNav tab={tab} items={subItems} activeSub={sub!} />
          <div className="appr-content">
            {tab === "layout" && sub === "effects" && <EffectsPage section="text" />}
            {tab === "appearance" && sub === "avatar" && <EffectsPage section="avatar" />}
            {tab === "appearance" && sub === "cursor" && <EffectsPage section="cursor" />}
            {tab === "appearance" && sub === "bg" && <EffectsPage section="bg" />}
            {!(tab === "layout" && sub === "effects") &&
              !(tab === "appearance" && (sub === "avatar" || sub === "cursor")) && (
                <ProfileInfoForm
                  tab={tab}
                  sub={sub!}
                  avatar={profile.avatar}
                  banner={profile.banner}
                  backgroundType={profile.backgroundType || "particles"}
                  backgroundValue={profile.backgroundValue || "#050507"}
                  musicTracks={[parseStringArray(profile.musicTracks)[0] ?? null]}
                  musicTrackTitle={profile.musicTrackTitle || ""}
                  musicTrackArtist={profile.musicTrackArtist || ""}
                  musicArtworkUrl={profile.musicArtworkUrl || ""}
                  musicLyricsSynced={profile.musicLyricsSynced || ""}
                  musicLyricsPlain={profile.musicLyricsPlain || ""}
                  musicShowLyrics={profile.musicShowLyrics}
                  playlistStyle={profile.playlistStyle}
                  layoutTemplate={profile.layoutTemplate}
                  isPremium={isPremium}
                  cursorPath={profile.cursorPath}
                  displayName={profile.displayName || ""}
                  location={profile.location || ""}
                  job={profile.job || ""}
                  birthDate={profile.birthDate ? profile.birthDate.toISOString().slice(0, 10) : ""}
                  bio={profile.bio || ""}
                  profileFont={profile.profileFont || "Syne"}
                  profileOpacity={profile.profileOpacity ?? 100}
                  profileBlur={profile.profileBlur ?? 0}
                  accentColor={profile.accentColor}
                  backgroundColor={profile.backgroundColor}
                  nameColor={profile.nameColor}
                  bioColor={profile.bioColor}
                  overlayColor={profile.overlayColor}
                />
              )}
          </div>
        </div>
      ) : tab === "badges" ? (
        <BadgesPage />
      ) : (
        <IntegrationsPage searchParams={Promise.resolve({ error: params.error, connected: params.connected })} />
      )}
    </>
  );
}
