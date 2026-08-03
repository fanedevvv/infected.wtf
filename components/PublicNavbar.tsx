import Link from "next/link";

export default function PublicNavbar({ user, active }: { user?: { username: string } | null; active?: "leaderboard" }) {
  return (
    <nav className="navbar">
      <Link href="/" className="navbar-brand">GETFAME.WTF</Link>
      <div className="navbar-links">
        <a href="https://discord.gg/BAEpkJ62VM" target="_blank" rel="noreferrer">Discord</a>
        <Link href="/leaderboard" style={active === "leaderboard" ? { color: "#fff", fontWeight: 600 } : undefined}>
          Leaderboard
        </Link>
        {user ? (
          <Link href="/dashboard" className="btn btn-primary btn-sm">Dashboard</Link>
        ) : (
          <>
            <Link href="/login" className="btn btn-secondary btn-sm">Login</Link>
            <Link href="/register" className="btn btn-primary btn-sm">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
