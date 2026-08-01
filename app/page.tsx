import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <div className="text-xs font-extrabold tracking-widest text-[var(--accent)] uppercase mb-6">
        GETFAME.WTF
      </div>
      <h1 className="font-[var(--font-display)] text-4xl sm:text-6xl font-extrabold mb-4 max-w-2xl">
        Your bio, your links, your fame.
      </h1>
      <p className="text-white/50 max-w-md mb-8">
        One page for everything you are. Customize it, share it, watch it grow.
      </p>
      <div className="flex gap-3">
        <Link href="/register" className="gf-btn">
          Get started
        </Link>
        <Link
          href="/leaderboard"
          className="inline-flex items-center justify-center rounded-[10px] border border-white/10 px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/5"
        >
          Leaderboard
        </Link>
      </div>
    </main>
  );
}
