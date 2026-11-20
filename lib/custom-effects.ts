import { prisma } from "./prisma";
import type { CollectibleDef, CollectibleRarity } from "./collectibles";

// Profile effects uploaded by staff from /admin (animated WebP/GIF/APNG, or WebM with transparency). They sit in the
// Collectibles shop next to the built-in ones, with ids "cx-<row id>", and play stretched over the profile card.

export type EffectMediaInfo = { url: string; kind: "video" | "image" };
export type CustomEffectDef = CollectibleDef & { media: EffectMediaInfo };

export const CUSTOM_PREFIX = "cx-";
export const RARITIES: CollectibleRarity[] = ["common", "rare", "epic", "legendary", "mythic"];

export const isCustomEffectId = (id: string | null | undefined): id is string => !!id && id.startsWith(CUSTOM_PREFIX);
export const customRowId = (id: string) => parseInt(id.slice(CUSTOM_PREFIX.length), 10);

type Row = { id: number; name: string; description: string | null; rarity: string; price: number; file: string; kind: string; enabled: boolean };

export function customToDef(r: Row): CustomEffectDef {
  return {
    id: `${CUSTOM_PREFIX}${r.id}`,
    kind: "effect",
    name: r.name,
    desc: r.description || "",
    rarity: (RARITIES as string[]).includes(r.rarity) ? (r.rarity as CollectibleRarity) : "epic",
    source: "shop",
    price: r.price,
    media: { url: `/${r.file}`, kind: r.kind === "video" ? "video" : "image" },
  };
}

/** Enabled uploaded effects, as shop items. */
export async function listCustomEffects(): Promise<CustomEffectDef[]> {
  const rows = await prisma.customEffect.findMany({ where: { enabled: true }, orderBy: { id: "asc" } });
  return rows.map(customToDef);
}

/** One uploaded effect by its "cx-<id>" id (disabled ones too when `any`, so equipped copies keep working). */
export async function getCustomEffect(id: string | null | undefined, any = true): Promise<CustomEffectDef | null> {
  if (!isCustomEffectId(id)) return null;
  const n = customRowId(id);
  if (!Number.isFinite(n)) return null;
  const row = await prisma.customEffect.findUnique({ where: { id: n } });
  if (!row || (!any && !row.enabled)) return null;
  return customToDef(row);
}
