import { prisma } from "./prisma";
import { getSession } from "./session";
import { decryptEmail } from "./crypto";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;
  return { ...user, email: decryptEmail(user.email) };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export function isStaff(user: { isMod: boolean; isAdmin: boolean; isOwner: boolean } | null): boolean {
  if (!user) return false;
  return user.isMod || user.isAdmin || user.isOwner;
}

export function isAdminUser(user: { isAdmin: boolean; isOwner: boolean } | null): boolean {
  if (!user) return false;
  return user.isAdmin || user.isOwner;
}

export function validateUsername(u: string): boolean {
  return /^[a-zA-Z0-9_\-.]{3,30}$/.test(u);
}
