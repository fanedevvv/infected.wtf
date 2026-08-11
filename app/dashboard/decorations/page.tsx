import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/active-profile";
import { DECORATIONS } from "@/lib/decorations";
import DecorationsClient from "./DecorationsClient";

function listGallery(dir: string): string[] {
  const abs = path.join(process.cwd(), "public", "assets", "img", dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => /\.(png|webp|jpe?g|gif)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export default async function DecorationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeProfileId = await getActiveProfileId(user.id);
  const profile = await prisma.profile.findUnique({ where: { id: activeProfileId } });
  if (!profile) redirect("/dashboard");

  const owned = (profile.decorationsOwned as string[] | null) ?? [];

  return (
    <DecorationsClient
      tokens={user.tokens}
      avatar={profile.avatar}
      catalog={Object.entries(DECORATIONS).map(([id, d]) => ({ id, ...d, owned: owned.includes(id) }))}
      activeDecoration={profile.activeDecoration}
      library={{ decorations: listGallery("decorations"), items: listGallery("items") }}
    />
  );
}
