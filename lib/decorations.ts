export type DecorationRarity = "common" | "rare" | "epic" | "legendary";

export type DecorationDef = {
  name: string;
  price: number;
  rarity: DecorationRarity;
  desc: string;
};

// Original decorative avatar-frame artwork (not sourced from any third party).
export const DECORATIONS: Record<string, DecorationDef> = {
  halo: { name: "Halo", price: 150, rarity: "common", desc: "A soft golden ring hovering above your avatar." },
  laurel: { name: "Laurel Wreath", price: 200, rarity: "common", desc: "A classic laurel wreath framing your avatar." },
  stars: { name: "Starlit", price: 250, rarity: "common", desc: "Twinkling stars orbiting your avatar." },
  hearts: { name: "Sweetheart", price: 250, rarity: "common", desc: "Floating hearts drifting around your frame." },
  bubbles: { name: "Bubbly", price: 200, rarity: "common", desc: "Gentle bubbles rising around your avatar." },
  thorns: { name: "Thornbound", price: 400, rarity: "rare", desc: "A ring of dark thorns wrapping your frame." },
  frost: { name: "Frostbite", price: 400, rarity: "rare", desc: "Icy crystal shards framing your avatar." },
  flame: { name: "Blazing", price: 450, rarity: "rare", desc: "A ring of living fire around your avatar." },
  storm: { name: "Storm Ring", price: 450, rarity: "rare", desc: "Crackling lightning arcs around your frame." },
  wings_angel: { name: "Angelic Wings", price: 700, rarity: "epic", desc: "A pair of white feathered wings behind your avatar." },
  wings_demon: { name: "Demonic Wings", price: 700, rarity: "epic", desc: "A pair of dark leathery wings behind your avatar." },
  crown_gold: { name: "Golden Crown", price: 800, rarity: "epic", desc: "A regal gemmed crown resting above your avatar." },
  rainbow: { name: "Prism Ring", price: 650, rarity: "epic", desc: "A shifting rainbow-gradient ring around your frame." },
  galaxy_ring: { name: "Galaxy Ring", price: 1200, rarity: "legendary", desc: "A swirling galaxy nebula ring, the rarest of frames." },
  phoenix: { name: "Phoenix Rebirth", price: 1500, rarity: "legendary", desc: "Blazing phoenix wings wrap fully around your avatar." },

  cat_ears: { name: "Cat Ears", price: 180, rarity: "common", desc: "Playful cat ears perched above your avatar." },
  bunny_ears: { name: "Bunny Ears", price: 180, rarity: "common", desc: "Floppy bunny ears above your avatar." },
  clover: { name: "Lucky Clover", price: 220, rarity: "common", desc: "Four-leaf clovers orbiting for good luck." },
  pumpkin: { name: "Jack-o'-Lantern", price: 300, rarity: "rare", desc: "A glowing carved pumpkin ring for spooky season." },
  snowfall: { name: "Snowfall", price: 300, rarity: "rare", desc: "Soft snowflakes orbiting your frame." },
  lanterns: { name: "Lucky Lanterns", price: 350, rarity: "rare", desc: "Red paper lanterns glowing around your avatar." },
  vinyl: { name: "Vinyl Spin", price: 350, rarity: "rare", desc: "A spinning vinyl record ring behind your avatar." },
  pixel_ring: { name: "8-Bit Frame", price: 380, rarity: "rare", desc: "A retro pixel-art border around your avatar." },
  diamond_ring: { name: "Diamond Facet", price: 600, rarity: "epic", desc: "Sparkling faceted diamonds circling your frame." },
  unicorn: { name: "Unicorn Spirit", price: 900, rarity: "epic", desc: "A glowing horn with a drifting rainbow mane." },
  wolf_spirit: { name: "Wolf Spirit", price: 950, rarity: "epic", desc: "A ghostly spirit wolf howling beside your avatar." },
  dragon_wings: { name: "Dragon Wings", price: 1300, rarity: "legendary", desc: "Scaled dragon wings unfurl behind your avatar." },
};

export const RARITY_COLOR: Record<DecorationRarity, string> = {
  common: "#9ca3af",
  rare: "#60a5fa",
  epic: "#c084fc",
  legendary: "#fbbf24",
};
