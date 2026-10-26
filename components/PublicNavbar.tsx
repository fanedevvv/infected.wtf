import LabNav from "./lab/LabNav";

// Kept so older pages keep importing the public navbar by its old name.
export default function PublicNavbar({ user }: { user?: { username: string } | null; active?: "leaderboard" }) {
  return <LabNav user={user} />;
}
