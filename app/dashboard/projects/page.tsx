import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import ProjectsClient from "./ProjectsClient";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <ProjectsClient />;
}
