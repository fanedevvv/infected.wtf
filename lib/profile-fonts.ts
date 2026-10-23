// Fonts a profile can render in. Single source of truth for the dashboard
// picker, the premium gate, and the live profile page.
export type ProfileFontDef = { id: string; label: string; family: string; premium: boolean };

/** The historical DB default — never actually applied to the rendered page
 *  until this font system existed, so treating it as the "inherit the
 *  layout's own font" sentinel keeps every profile that never touched this
 *  setting pixel-identical to before. */
export const DEFAULT_PROFILE_FONT = "Syne";

export const PROFILE_FONTS: ProfileFontDef[] = [
  { id: "Syne", label: "Layout's own", family: "", premium: false },
  { id: "Inter", label: "Inter", family: "Inter:wght@400;700", premium: false },
  { id: "Poppins", label: "Poppins", family: "Poppins:wght@400;700", premium: false },
  { id: "Outfit", label: "Outfit", family: "Outfit:wght@400;700", premium: false },
  { id: "Space Grotesk", label: "Space Grotesk", family: "Space+Grotesk:wght@400;700", premium: false },
  { id: "Nunito", label: "Nunito", family: "Nunito:wght@400;700", premium: false },
  { id: "Quicksand", label: "Quicksand", family: "Quicksand:wght@400;700", premium: false },
  { id: "Fredoka", label: "Fredoka", family: "Fredoka:wght@400;700", premium: false },
  { id: "Comfortaa", label: "Comfortaa", family: "Comfortaa:wght@400;700", premium: false },
  { id: "Bebas Neue", label: "Bebas Neue", family: "Bebas+Neue", premium: false },
  { id: "Playfair Display", label: "Playfair Display", family: "Playfair+Display:wght@400;700", premium: false },
  { id: "Cormorant", label: "Cormorant", family: "Cormorant:wght@400;700", premium: false },
  { id: "JetBrains Mono", label: "JetBrains Mono", family: "JetBrains+Mono:wght@400;700", premium: false },
  // Premium / decorative
  { id: "Nosifer", label: "Nosifer", family: "Nosifer", premium: true },
  { id: "Creepster", label: "Creepster", family: "Creepster", premium: true },
  { id: "Butcherman", label: "Butcherman", family: "Butcherman", premium: true },
  { id: "Metal Mania", label: "Metal Mania", family: "Metal+Mania", premium: true },
  { id: "UnifrakturMaguntia", label: "Blackletter", family: "UnifrakturMaguntia", premium: true },
  { id: "Rubik Glitch", label: "Rubik Glitch", family: "Rubik+Glitch", premium: true },
  { id: "Press Start 2P", label: "Press Start 2P", family: "Press+Start+2P", premium: true },
  { id: "Silkscreen", label: "Silkscreen", family: "Silkscreen:wght@400;700", premium: true },
  { id: "VT323", label: "VT323", family: "VT323", premium: true },
  { id: "Orbitron", label: "Orbitron", family: "Orbitron:wght@400;700", premium: true },
  { id: "Audiowide", label: "Audiowide", family: "Audiowide", premium: true },
  { id: "Bangers", label: "Bangers", family: "Bangers", premium: true },
  { id: "Permanent Marker", label: "Permanent Marker", family: "Permanent+Marker", premium: true },
  { id: "Sedgwick Ave", label: "Sedgwick Ave", family: "Sedgwick+Ave", premium: true },
  { id: "Pacifico", label: "Pacifico", family: "Pacifico", premium: true },
  { id: "Lobster", label: "Lobster", family: "Lobster", premium: true },
  { id: "Kaushan Script", label: "Kaushan Script", family: "Kaushan+Script", premium: true },
  { id: "Special Elite", label: "Typewriter", family: "Special+Elite", premium: true },
  { id: "Cinzel Decorative", label: "Cinzel Decorative", family: "Cinzel+Decorative:wght@400;700", premium: true },
  { id: "Black Ops One", label: "Black Ops One", family: "Black+Ops+One", premium: true },
  { id: "Bungee", label: "Bungee", family: "Bungee", premium: true },
  { id: "Rye", label: "Rye", family: "Rye", premium: true },
];

const BY_ID = new Map(PROFILE_FONTS.map((f) => [f.id, f]));

export function isPremiumFont(id: string): boolean {
  return BY_ID.get(id)?.premium ?? false;
}

export function isKnownFont(id: string): boolean {
  return BY_ID.has(id);
}

/** CSS font-family value for a stored profileFont id — null for the default
 *  sentinel, meaning "don't override, inherit the page's own font". */
export function profileFontFamily(id: string): string | null {
  const def = BY_ID.get(id);
  if (!def || id === DEFAULT_PROFILE_FONT || !def.family) return null;
  return `'${def.id}', sans-serif`;
}

/** Google Fonts stylesheet URL for one or more font ids (skips the default sentinel). */
export function googleFontsHref(ids: string[]): string | null {
  const families = Array.from(new Set(ids))
    .map((id) => BY_ID.get(id))
    .filter((f): f is ProfileFontDef => !!f && !!f.family);
  if (!families.length) return null;
  const params = families.map((f) => `family=${f.family}`).join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
