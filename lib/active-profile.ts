import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE_NAME = "active_profile";

/** Resolves which of the user's pages is currently being edited/viewed in the dashboard, validating cookie-supplied ids against ownership. */
export async function getActiveProfileId(userId: number): Promise<number> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  const requested = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isNaN(requested)) {
    const owned = await prisma.profile.findFirst({ where: { id: requested, userId }, select: { id: true } });
    if (owned) return owned.id;
  }
  const primary = await prisma.profile.findFirst({ where: { userId, isPrimary: true }, select: { id: true } });
  if (primary) return primary.id;
  const any = await prisma.profile.findFirstOrThrow({ where: { userId }, select: { id: true } });
  return any.id;
}

export async function getActiveProfile(userId: number) {
  const id = await getActiveProfileId(userId);
  return prisma.profile.findUniqueOrThrow({ where: { id } });
}

export async function setActiveProfileCookie(profileId: number) {
  const store = await cookies();
  store.set(COOKIE_NAME, String(profileId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearActiveProfileCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export const MAX_PAGES_FREE = 1;
export const MAX_PAGES_PREMIUM = 3;

export function maxPagesFor(isPremiumNow: boolean): number {
  return isPremiumNow ? MAX_PAGES_PREMIUM : MAX_PAGES_FREE;
}
