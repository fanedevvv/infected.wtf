import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });

  return (
    <main className="flex-1 px-4 py-10 max-w-3xl mx-auto w-full">
      <div className="text-xs font-extrabold tracking-widest text-[var(--accent)] uppercase mb-6">
        Dashboard
      </div>
      <h1 className="font-[var(--font-display)] text-3xl font-bold mb-1">
        Welcome, {user.username}
      </h1>
      <p className="text-white/50 text-sm mb-8">
        Your page: <span className="text-white">infected.wtf/{user.username}</span> ·{" "}
        {profile?.views ?? 0} views · {user.tokens} tokens
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          ["Profile info", "/dashboard/info"],
          ["Links", "/dashboard/links"],
          ["Effects", "/dashboard/effects"],
          ["Integrations", "/dashboard/integrations"],
          ["Badges", "/dashboard/badges"],
          ["Shop", "/dashboard/shop"],
          ["Referral", "/dashboard/referral"],
          ["Analytics", "/dashboard/analytics"],
          ["Settings", "/dashboard/settings"],
        ].map(([label, href]) => (
          <Link key={href} href={href} className="gf-card p-4 text-sm font-medium hover:border-[var(--accent)]/40">
            {label}
          </Link>
        ))}
      </div>

      <form
        action={async () => {
          "use server";
          const { destroySession } = await import("@/lib/session");
          await destroySession();
          redirect("/login");
        }}
        className="mt-10"
      >
        <button type="submit" className="text-xs text-white/40 hover:text-white/70">
          Log out
        </button>
      </form>
    </main>
  );
}
