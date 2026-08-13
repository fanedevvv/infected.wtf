import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/active-profile";
import { getCustomDecorationMeta, normalizeDecorationId } from "@/lib/decorations";
import { getDiscordDecorationNameById } from "@/lib/discord-decoration-names";
import DecorationsClient from "./DecorationsClient";

function listDecorationFiles(): string[] {
  const abs = path.join(process.cwd(), "public", "assets", "img", "decorations");
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
  const seen = new Set<string>();
  const catalog = listDecorationFiles()
    .map((file) => normalizeDecorationId(file.replace(/\.(png|webp|jpe?g|gif)$/i, "")))
    .map((id) => {
      const meta = getCustomDecorationMeta(id);
      if (!meta) return null;
      const name = getDiscordDecorationNameById(meta.id);
      if (!name) return null;
      return {
        id: meta.id,
        name,
        price: meta.price,
        rarity: meta.rarity,
        desc: meta.desc,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .sort((a, b) => {
      const an = Number((a.id.match(/^custom_(\d+)$/i) || ["", "0"])[1]);
      const bn = Number((b.id.match(/^custom_(\d+)$/i) || ["", "0"])[1]);
      return an - bn;
    })
    .map((row) => ({ ...row, owned: owned.includes(row.id) }));

  return (
    <DecorationsClient
      tokens={user.tokens}
      avatar={profile.avatar}
      catalog={catalog}
      activeDecoration={profile.activeDecoration}
    />
  );
}
