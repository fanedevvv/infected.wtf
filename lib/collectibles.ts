// Collectibles: nameplates (an animated plate behind your name, shown everywhere your name appears) and profile
// effects (an animation that plays over your profile when someone opens it). Like Discord's collectibles.
//
// Where an item comes from:
//   shop    — bought with tokens
//   spin    — only from the Daily Spin
//   quest   — only as a quest reward
//   plus    — free for Infected Plus members (while they have Plus)
//   limited — a numbered drop: a fixed supply and an end date; each copy has a serial (#12/100)

export type CollectibleKind = "nameplate" | "effect";
export type CollectibleRarity = "common" | "rare" | "epic" | "legendary" | "mythic";
export type CollectibleSource = "shop" | "spin" | "quest" | "plus" | "limited";

export type CollectibleDef = {
  id: string;
  kind: CollectibleKind;
  name: string;
  desc: string;
  rarity: CollectibleRarity;
  source: CollectibleSource;
  price?: number; // shop + limited
  limited?: { supply: number; endsAt: string }; // ISO date
};

export const NAMEPLATES: CollectibleDef[] = [
  { id: "deepsea", kind: "nameplate", name: "Deep Sea", desc: "Slow ocean waves rolling behind your name.", rarity: "common", source: "shop", price: 250 },
  { id: "frost", kind: "nameplate", name: "Permafrost", desc: "Icy blue frost with a cold shimmer.", rarity: "common", source: "shop", price: 300 },
  { id: "sakura", kind: "nameplate", name: "Sakura", desc: "Soft pink blossoms drifting by.", rarity: "rare", source: "shop", price: 300 },
  { id: "toxic", kind: "nameplate", name: "Toxic Waste", desc: "Hazard stripes and a toxic green glow.", rarity: "rare", source: "shop", price: 350 },
  { id: "vapor", kind: "nameplate", name: "Vaporwave", desc: "A retro sunset over a neon grid.", rarity: "rare", source: "shop", price: 350 },
  { id: "aurora", kind: "nameplate", name: "Aurora", desc: "Northern lights shifting through green and violet.", rarity: "rare", source: "shop", price: 400 },
  { id: "inferno", kind: "nameplate", name: "Inferno", desc: "Flames licking up behind your name.", rarity: "rare", source: "shop", price: 450 },
  { id: "bloodline", kind: "nameplate", name: "Bloodline", desc: "Deep crimson with a slow pulse.", rarity: "rare", source: "shop", price: 450 },
  { id: "mainframe", kind: "nameplate", name: "Mainframe", desc: "Falling green code, straight from the matrix.", rarity: "epic", source: "shop", price: 550 },
  { id: "storm", kind: "nameplate", name: "Thunderstorm", desc: "Dark clouds with lightning flashing through.", rarity: "epic", source: "shop", price: 600 },
  { id: "galaxy", kind: "nameplate", name: "Galaxy", desc: "A swirling nebula full of stars.", rarity: "epic", source: "shop", price: 650 },
  { id: "goldrush", kind: "nameplate", name: "Gold Rush", desc: "Polished gold with a shine sweeping across.", rarity: "legendary", source: "shop", price: 900 },
  { id: "jackpot", kind: "nameplate", name: "Jackpot", desc: "Casino lights — only from the Daily Spin.", rarity: "epic", source: "spin" },
  { id: "questrunner", kind: "nameplate", name: "Quest Runner", desc: "Earned by completing 10 quests.", rarity: "epic", source: "quest" },
  { id: "plusprism", kind: "nameplate", name: "Plus Prism", desc: "Holographic foil, free while you have Infected Plus.", rarity: "legendary", source: "plus" },
  { id: "winteroutbreak", kind: "nameplate", name: "Winter Outbreak", desc: "Frozen toxic ice. Limited to 100 copies.", rarity: "mythic", source: "limited", price: 1200, limited: { supply: 100, endsAt: "2027-01-01T00:00:00Z" } },
];

export const PROFILE_EFFECTS: CollectibleDef[] = [
  { id: "snow", kind: "effect", name: "First Snow", desc: "Gentle snow falling over your profile.", rarity: "common", source: "shop", price: 300 },
  { id: "petals", kind: "effect", name: "Sakura Storm", desc: "A burst of cherry blossoms, then a soft drift.", rarity: "rare", source: "shop", price: 400 },
  { id: "hearts", kind: "effect", name: "Lovestruck", desc: "Hearts floating up across your profile.", rarity: "rare", source: "shop", price: 350 },
  { id: "confetti", kind: "effect", name: "Party Time", desc: "A confetti blast when someone opens your page.", rarity: "rare", source: "shop", price: 350 },
  { id: "embers", kind: "effect", name: "Ember Rain", desc: "Glowing embers rising like a fire below.", rarity: "rare", source: "shop", price: 450 },
  { id: "outbreak", kind: "effect", name: "Outbreak", desc: "Toxic spores burst out and hang in the air.", rarity: "epic", source: "shop", price: 550 },
  { id: "shootingstars", kind: "effect", name: "Shooting Stars", desc: "Stars streaking across your profile.", rarity: "epic", source: "shop", price: 600 },
  { id: "thunder", kind: "effect", name: "Thunderstrike", desc: "Lightning cracks across the screen.", rarity: "epic", source: "shop", price: 700 },
  { id: "moneyrain", kind: "effect", name: "Money Rain", desc: "Gold coins raining down.", rarity: "legendary", source: "shop", price: 850 },
  { id: "luckyspin", kind: "effect", name: "Lucky Sparks", desc: "Golden sparks — only from the Daily Spin.", rarity: "epic", source: "spin" },
  { id: "completionist", kind: "effect", name: "Completionist", desc: "Rainbow sparkles for finishing every one-time quest.", rarity: "legendary", source: "quest" },
  { id: "plusaura", kind: "effect", name: "Plus Aura", desc: "A golden aura, free while you have Infected Plus.", rarity: "legendary", source: "plus" },
  { id: "patientzero", kind: "effect", name: "Patient Zero", desc: "A toxic green outbreak with a biohazard flash. Limited to 50 copies.", rarity: "mythic", source: "limited", price: 1500, limited: { supply: 50, endsAt: "2027-01-01T00:00:00Z" } },
];

export const ALL_COLLECTIBLES = [...NAMEPLATES, ...PROFILE_EFFECTS];
const BY_ID = new Map(ALL_COLLECTIBLES.map((c) => [`${c.kind}:${c.id}`, c]));

export function getCollectible(kind: CollectibleKind, id: string | null | undefined): CollectibleDef | null {
  return id ? BY_ID.get(`${kind}:${id}`) ?? null : null;
}

/** Key used for limited-drop mints (collectible_mints.item_key). */
export const mintKey = (c: CollectibleDef) => `${c.kind}:${c.id}`;

export function isLimitedOpen(c: CollectibleDef, now = Date.now()) {
  return !!c.limited && now < new Date(c.limited.endsAt).getTime();
}

/**
 * Whether a profile can show this item right now: it owns it, or it's a Plus item and the owner has Plus.
 * (Plus items aren't stored as owned — they come and go with the subscription.)
 */
export function canUse(c: CollectibleDef | null, owned: Set<string>, isPremium: boolean) {
  if (!c) return false;
  if (c.source === "plus") return isPremium;
  return owned.has(c.id);
}

export const RARITY_COLOR: Record<CollectibleRarity, string> = {
  common: "#9ca3af",
  rare: "#60a5fa",
  epic: "#c084fc",
  legendary: "#fbbf24",
  mythic: "#ff2a6d",
};
