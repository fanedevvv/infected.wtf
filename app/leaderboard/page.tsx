import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function LeaderboardPage() {
  const profiles = await prisma.profile.findMany({
    orderBy: { views: "desc" },
    take: 50,
    include: { user: { select: { username: true } } },
  });

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full">
      <div className="text-xs font-extrabold tracking-widest text-[var(--accent)] uppercase mb-6">
        Leaderboard
      </div>
      <h1 className="font-[var(--font-display)] text-3xl font-bold mb-8">Top profiles</h1>

      {profiles.length === 0 ? (
        <p className="text-white/40 text-sm">No profiles yet — be the first!</p>
      ) : (
        <div className="space-y-2">
          {profiles.map((p, i) => (
            <Link
              key={p.userId}
              href={`/${p.user.username}`}
              className="gf-card p-4 flex items-center justify-between hover:border-[var(--accent)]/40"
            >
              <div className="flex items-center gap-3">
                <span className="text-white/30 font-bold w-6 text-right">{i + 1}</span>
                <div
                  className="w-9 h-9 rounded-full bg-cover bg-center bg-white/5"
                  style={{ backgroundImage: p.avatar ? `url(${p.avatar})` : undefined }}
                />
                <span className="font-medium text-sm">{p.displayName || p.user.username}</span>
              </div>
              <span className="text-white/40 text-xs">{p.views.toLocaleString()} views</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
