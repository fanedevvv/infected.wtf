import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import LinksManager from "./LinksManager";

export default async function LinksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const links = await prisma.socialLink.findMany({ where: { userId: user.id }, orderBy: { displayOrder: "asc" } });

  return (
    <LinksManager
      initialLinks={links.map((l) => ({ id: l.id, platform: l.platform, url: l.url }))}
    />
  );
}
