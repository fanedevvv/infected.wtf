// Profile layouts: one list shared by the editor picker, the save API and the profile page.

export type LayoutId =
  | "modern" | "classic" | "split" | "dock"
  | "deck" | "orbit" | "terminal" | "scrapbook" | "hexgrid" | "vinyl" | "constellation";

export const PROFILE_LAYOUTS: { id: LayoutId | "freemode"; label: string; premium: boolean; comingSoon?: boolean }[] = [
  { id: "freemode", label: "Free Mode", premium: false, comingSoon: true },
  { id: "modern", label: "Modern", premium: false },
  { id: "classic", label: "Classic Card", premium: false },
  { id: "split", label: "Split", premium: false },
  { id: "dock", label: "Dock", premium: false },
  { id: "deck", label: "Deck", premium: true },
  { id: "orbit", label: "Orbit", premium: true },
  { id: "terminal", label: "Terminal", premium: true },
  { id: "scrapbook", label: "Scrapbook", premium: true },
  { id: "hexgrid", label: "Hex Grid", premium: true },
  { id: "vinyl", label: "Vinyl", premium: true },
  { id: "constellation", label: "Constellation", premium: true },
];

export const DEFAULT_LAYOUT: LayoutId = "modern";

const SELECTABLE = new Set<string>(PROFILE_LAYOUTS.filter((l) => !l.comingSoon).map((l) => l.id));
const PREMIUM = new Set<string>(PROFILE_LAYOUTS.filter((l) => l.premium).map((l) => l.id));

// Layouts from before the current set (still possible in saved marketplace themes) map to their nearest successor.
const LEGACY: Record<string, LayoutId> = {
  editorial: "split", banner: "classic", compact: "classic", aurora: "orbit", cinematic: "deck", dossier: "split",
};

export function isPremiumLayout(id: string) {
  return PREMIUM.has(id);
}

/** A stored value as a known layout, falling back to the default (or a free layout for non-premium owners). */
export function resolveLayout(value: string | null | undefined, isPremium: boolean): LayoutId {
  const id = value && (LEGACY[value] ?? value);
  if (!id || !SELECTABLE.has(id)) return DEFAULT_LAYOUT;
  if (PREMIUM.has(id) && !isPremium) return DEFAULT_LAYOUT;
  return id as LayoutId;
}
