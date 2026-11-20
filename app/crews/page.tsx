import { redirect } from "next/navigation";

// Crews became Groups.
export default function OldCrewsPage() {
  redirect("/groups");
}
