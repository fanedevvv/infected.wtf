import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/active-profile";
import { DECORATION_CATEGORIES, getCustomDecorationMeta, normalizeDecorationId } from "@/lib/decorations";
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
  const files = listGallery("decorations");
  const seen = new Set<string>();
  const catalog = files
    .map((file) => normalizeDecorationId(file.replace(/\.(png|webp|jpe?g|gif)$/i, "")))
    .map((id) => getCustomDecorationMeta(id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    })
    .sort((a, b) => a.number - b.number)
    .map((m) => ({ id: m.id, name: m.name, price: m.price, rarity: m.rarity, desc: m.desc, category: m.category, owned: owned.includes(m.id) }));

  return (
    <DecorationsClient
      tokens={user.tokens}
      avatar={profile.avatar}
      catalog={catalog}
      activeDecoration={profile.activeDecoration}
      ownedDecorationIds={owned}
      categories={DECORATION_CATEGORIES}
    />
  );
}
