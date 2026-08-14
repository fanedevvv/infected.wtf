/** profile.badges / badgeHidden / badgeOrder (and similar) are stored as raw JSON text in a LongText
 *  column, not a native Prisma Json/array type — always go through these instead of casting with `as`. */
export function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function serializeStringArray(arr: string[]): string {
  return JSON.stringify(arr);
}

/** Same idea, but for object-shaped LongText columns (e.g. Integration.data). */
export function parseJsonObject<T = Record<string, unknown>>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as T) : null;
  } catch {
    return null;
  }
}
