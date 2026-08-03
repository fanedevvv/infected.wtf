export const SHOP_BADGES: Record<string, { name: string; price: number; desc: string; color: string }> = {
  fresh: { name: "Fresh", price: 50, desc: "Stay fresh. A clean badge for a clean vibe.", color: "#a8d8ff" },
  lover: { name: "Lover", price: 300, desc: "Show your love. A pink heart badge.", color: "#ff6ba0" },
  known: { name: "Known", price: 250, desc: "Show the world you're a known figure.", color: "#60a5fa" },
  rich: { name: "Rich", price: 500, desc: "Flex your wealth with the Rich badge.", color: "#fbbf24" },
  trapstar: { name: "Trapstar", price: 1000, desc: "For those who live the trap life.", color: "#f97316" },
  the_killer: { name: "The Killer", price: 1500, desc: "The most exclusive badge on the platform.", color: "#ef4444" },
};

export const SHOP_EFFECTS: Record<string, { name: string; price: number; type: "cursor" | "avatar" | "bg"; desc: string; color: string }> = {
  cursor_smoke: { name: "Smoke Trail", price: 200, type: "cursor", desc: "Gray smoke particles trailing your cursor", color: "#888" },
  cursor_fire: { name: "Fire Trail", price: 300, type: "cursor", desc: "Intense fire particles that burn behind you", color: "#ff4500" },
  cursor_soundwave: { name: "Sound Wave", price: 400, type: "cursor", desc: "Expanding sound rings from your cursor", color: "#00d4ff" },
  cursor_meteors: { name: "Meteors", price: 500, type: "cursor", desc: "Shooting meteors streaking behind cursor", color: "#ffd700" },
  cursor_leaves: { name: "Aesthetic Leaves", price: 600, type: "cursor", desc: "3D aesthetic leaves floating around cursor", color: "#4caf50" },
  cursor_water: { name: "Water Trail 3D", price: 800, type: "cursor", desc: "Smooth 3D water droplets trailing cursor", color: "#0ea5e9" },
  cursor_shadow: { name: "Soul Trail", price: 1000, type: "cursor", desc: "Ethereal glowing souls that drift behind your cursor", color: "#a8edff" },
  avatar_rocks: { name: "Rock Ring", price: 100, type: "avatar", desc: "Rocks orbiting around your avatar frame", color: "#78716c" },
  avatar_crown: { name: "Crown 3D", price: 350, type: "avatar", desc: "Glowing 3D crown floating above your profile", color: "#ffd700" },
  avatar_bloodrain: { name: "Blood Rain", price: 550, type: "avatar", desc: "Dark blood dripping down over your avatar", color: "#dc2626" },
  avatar_darkeyes: { name: "Dark Eyes", price: 900, type: "avatar", desc: "Eerie eyes appearing beside your avatar frame", color: "#7c3aed" },
  bg_fallingleaves: { name: "Falling Leaves", price: 150, type: "bg", desc: "Gentle autumn leaves drifting across the bg", color: "#84cc16" },
  bg_underwater: { name: "Underwater", price: 250, type: "bg", desc: "Bubbles and rays in an underwater scene", color: "#0369a1" },
  bg_gas: { name: "Gas Effect", price: 300, type: "bg", desc: "Swirling fog and gas clouds across the bg", color: "#6d28d9" },
  bg_fireworks: { name: "Fireworks", price: 400, type: "bg", desc: "Colorful fireworks bursting across the background", color: "#f97316" },
  bg_hell: { name: "Hell Background", price: 500, type: "bg", desc: "Hellfire and embers engulf your background", color: "#ef4444" },
  bg_shadowworld: { name: "Shadow World", price: 1000, type: "bg", desc: "Dark creepy shadow realm, highest tier bg", color: "#1e1b4b" },
};
