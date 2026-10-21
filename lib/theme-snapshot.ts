// Profile fields a marketplace theme captures on publish and writes back on apply/preview.
export const THEME_SNAPSHOT_FIELDS = [
  "accentColor", "backgroundColor", "nameColor", "bioColor", "overlayColor",
  "backgroundType", "backgroundValue", "nameEffect", "bioEffect", "profileFont",
  "avatarShape", "avatarRing", "particleEffect", "cursorTrail", "layoutTemplate", "playlistStyle",
] as const;

export function pickThemeSnapshot(theme: object): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const f of THEME_SNAPSHOT_FIELDS) data[f] = (theme as Record<string, unknown>)[f];
  return data;
}
