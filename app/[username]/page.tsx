import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getProfileBadges } from "@/lib/badges";
import { recordProfileView } from "@/lib/views";

const PLATFORM_COLORS: Record<string, string> = {
  steam: "#1b2838",
  spotify: "#1DB954",
  discord: "#5865F2",
  instagram: "#E1306C",
  twitter: "#000000",
  youtube: "#FF0000",
  twitch: "#9146FF",
  github: "#333333",
  tiktok: "#010101",
  website: "#555555",
};

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    include: { profile: true, socialLinks: { orderBy: { displayOrder: "asc" } } },
  });

  if (!user || !user.profile) notFound();
  if (user.banned) notFound();

  const h = await headers();
  const ip = (h.get("x-forwarded-for") || h.get("cf-connecting-ip") || "0.0.0.0").split(",")[0].trim();
  const ua = h.get("user-agent") || "";
  const country = h.get("cf-ipcountry") || "";
  recordProfileView(user.id, ip, ua, country).catch(() => {});

  const badges = await getProfileBadges(user.id);
  const profile = user.profile;

  const bg =
    profile.backgroundType === "gradient"
      ? { backgroundImage: profile.backgroundValue }
      : profile.backgroundType === "color"
        ? { backgroundColor: profile.backgroundValue }
        : { backgroundColor: "#050507" };

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16" style={bg}>
      <div
        className="gf-card w-full max-w-sm p-8 text-center"
        style={{ opacity: (profile.profileOpacity ?? 100) / 100 }}
      >
        <div
          className="w-24 h-24 mx-auto mb-4 rounded-full bg-cover bg-center border-2"
          style={{
            backgroundImage: profile.avatar ? `url(${profile.avatar})` : undefined,
            backgroundColor: "#111",
            borderColor: profile.accentColor,
          }}
        />
        <h1 className="font-[var(--font-display)] text-xl font-bold">
          {profile.displayName || user.username}
        </h1>
        <p className="text-white/40 text-sm mb-2">@{user.username}</p>

        {badges.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-3">
            {badges.map((b) => (
              <span
                key={b.id}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                style={{ borderColor: profile.accentColor, color: profile.accentColor }}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}

        {profile.bio && <p className="text-white/70 text-sm mb-5 whitespace-pre-wrap">{profile.bio}</p>}

        <div className="space-y-2">
          {user.socialLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-[10px] border border-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors"
              style={{ borderColor: PLATFORM_COLORS[link.platform] + "40" }}
            >
              {link.platform}
            </a>
          ))}
        </div>

        <p className="text-white/25 text-[11px] mt-6">{profile.views} views</p>
      </div>
    </main>
  );
}
