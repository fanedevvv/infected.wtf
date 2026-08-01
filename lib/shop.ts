export const SHOP_BADGES: Record<string, { name: string; price: number }> = {
  fresh: { name: "Fresh", price: 50 },
  lover: { name: "Lover", price: 300 },
  known: { name: "Known", price: 250 },
  rich: { name: "Rich", price: 500 },
  trapstar: { name: "Trapstar", price: 1000 },
  the_killer: { name: "The Killer", price: 1500 },
};

export const SHOP_EFFECTS: Record<string, { name: string; price: number; type: "cursor" | "avatar" | "bg" }> = {
  cursor_smoke: { name: "Smoke Trail", price: 200, type: "cursor" },
  cursor_fire: { name: "Fire Trail", price: 300, type: "cursor" },
  cursor_soundwave: { name: "Sound Wave", price: 400, type: "cursor" },
  cursor_meteors: { name: "Meteors", price: 500, type: "cursor" },
  cursor_leaves: { name: "Aesthetic Leaves", price: 600, type: "cursor" },
  cursor_water: { name: "Water Trail 3D", price: 800, type: "cursor" },
  cursor_shadow: { name: "Soul Trail", price: 1000, type: "cursor" },
  avatar_rocks: { name: "Rock Ring", price: 100, type: "avatar" },
  avatar_crown: { name: "Crown 3D", price: 350, type: "avatar" },
  avatar_bloodrain: { name: "Blood Rain", price: 550, type: "avatar" },
  avatar_darkeyes: { name: "Dark Eyes", price: 900, type: "avatar" },
  bg_fallingleaves: { name: "Falling Leaves", price: 150, type: "bg" },
  bg_underwater: { name: "Underwater", price: 250, type: "bg" },
  bg_gas: { name: "Gas Effect", price: 300, type: "bg" },
  bg_fireworks: { name: "Fireworks", price: 400, type: "bg" },
  bg_hell: { name: "Hell Background", price: 500, type: "bg" },
  bg_shadowworld: { name: "Shadow World", price: 1000, type: "bg" },
};
