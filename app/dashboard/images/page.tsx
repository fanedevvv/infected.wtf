import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import ImagesClient from "./ImagesClient";

export default async function ImagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <ImagesClient />;
}
