import { prisma } from "./prisma";
import { getSession } from "./session";
import { decryptEmail } from "./crypto";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;
  // These columns have defaults but are nullable in the schema; settle them once here so callers get plain values.
  return {
    ...user,
    email: decryptEmail(user.email),
    isAdmin: user.isAdmin ?? false,
    isOwner: user.isOwner ?? false,
    isPremium: user.isPremium ?? false,
    banned: user.banned ?? false,
    tokens: user.tokens ?? 0,
    tokensSpent: user.tokensSpent ?? 0,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

type RoleFlags = { isAdmin: boolean | null; isOwner: boolean | null };

export function isStaff(user: (RoleFlags & { isMod: boolean | null }) | null): boolean {
  if (!user) return false;
  return !!(user.isMod || user.isAdmin || user.isOwner);
}

export function isAdminUser(user: RoleFlags | null): boolean {
  if (!user) return false;
  return !!(user.isAdmin || user.isOwner);
}

export function validateUsername(u: string): boolean {
  return /^[a-zA-Z0-9_\-.]{3,30}$/.test(u);
}
