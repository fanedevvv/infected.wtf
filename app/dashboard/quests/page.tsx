import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import QuestsClient from "./QuestsClient";

export default async function QuestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <QuestsClient />;
}
