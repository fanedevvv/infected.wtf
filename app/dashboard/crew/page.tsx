import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import CrewClient from "./CrewClient";

export default async function CrewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <CrewClient />;
}
