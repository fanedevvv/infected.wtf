// Free Mode layout: the owner drags each profile element to any spot on a fixed-size canvas. The canvas is
// scaled to the screen as a whole, so the arrangement looks the same on a phone and a desktop.
// Shared by the profile renderer, the dashboard editor and the save API.

/** Canvas size in design pixels. Positions are stored as % of these, so the canvas can change size later. */
export const FREE_CANVAS = { width: 480, height: 760 } as const;

export const FREE_ELEMENTS = ["avatar", "name", "badges", "bio", "meta", "links", "bestfriend", "footer"] as const;
export type FreeElement = (typeof FREE_ELEMENTS)[number];

export const FREE_ELEMENT_LABEL: Record<FreeElement, string> = {
  avatar: "Avatar",
  name: "Name",
  badges: "Badges",
  bio: "Bio",
  meta: "Info (location, job…)",
  links: "Links",
  bestfriend: "Best friend",
  footer: "Views & likes",
};

/** Rough footprint of each element in design pixels — used by the editor to draw its placeholder blocks. */
export const FREE_ELEMENT_SIZE: Record<FreeElement, { w: number; h: number }> = {
  avatar: { w: 130, h: 130 },
  name: { w: 300, h: 56 },
  badges: { w: 260, h: 40 },
  bio: { w: 380, h: 70 },
  meta: { w: 340, h: 30 },
  links: { w: 340, h: 50 },
  bestfriend: { w: 260, h: 52 },
  footer: { w: 300, h: 44 },
};

/** x/y: the element's centre, in % of the canvas. */
export type FreeItem = { x: number; y: number; hidden?: boolean };
export type FreeLayout = Record<FreeElement, FreeItem>;

/** Starting arrangement: a centred column, close to the other layouts, ready to be dragged around. */
export const DEFAULT_FREE_LAYOUT: FreeLayout = {
  avatar: { x: 50, y: 14 },
  name: { x: 50, y: 28 },
  badges: { x: 50, y: 36 },
  bio: { x: 50, y: 46 },
  meta: { x: 50, y: 56 },
  links: { x: 50, y: 65 },
  bestfriend: { x: 50, y: 75 },
  footer: { x: 50, y: 88 },
};

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n * 10) / 10));

/** Any stored/posted value → a complete, safe layout (unknown keys dropped, positions clamped to the canvas). */
export function parseFreeLayout(raw: unknown): FreeLayout {
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }
  const src = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const out = {} as FreeLayout;
  for (const key of FREE_ELEMENTS) {
    const item = src[key] as Partial<FreeItem> | undefined;
    const base = DEFAULT_FREE_LAYOUT[key];
    const x = typeof item?.x === "number" && Number.isFinite(item.x) ? clamp(item.x) : base.x;
    const y = typeof item?.y === "number" && Number.isFinite(item.y) ? clamp(item.y) : base.y;
    out[key] = item?.hidden === true ? { x, y, hidden: true } : { x, y };
  }
  return out;
}

export function serializeFreeLayout(layout: FreeLayout): string {
  return JSON.stringify(parseFreeLayout(layout));
}
