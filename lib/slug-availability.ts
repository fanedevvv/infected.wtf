import { prisma } from "./prisma";

export const RESERVED_SLUGS = new Set([
  "login", "register", "logout", "dashboard", "leaderboard", "admin", "api", "support",
  "terms", "privacy", "banned", "maintenance", "forgot-password", "reset-password", "auth",
  "assets", "uploads", "favicon.ico", "partners",
]);

/** True when `slug` is already used as a page slug, an alias or a username (case-insensitive for aliases). */
export async function isSlugTaken(slug: string): Promise<boolean> {
  const lower = slug.toLowerCase();
  if (RESERVED_SLUGS.has(lower)) return true;
  const [page, alias, user] = await Promise.all([
    prisma.profile.findUnique({ where: { slug }, select: { id: true } }),
    prisma.profileAlias.findUnique({ where: { alias: lower }, select: { id: true } }),
    prisma.user.findFirst({ where: { username: slug }, select: { id: true } }),
  ]);
  return !!(page || alias || user);
}
