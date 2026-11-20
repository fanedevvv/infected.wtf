import { redirect } from "next/navigation";

// Crews became Groups: old /c/TAG links keep working.
export default async function OldCrewPage({ params }: { params: Promise<{ tag: string }> }) {
  redirect(`/g/${encodeURIComponent((await params).tag)}`);
}
