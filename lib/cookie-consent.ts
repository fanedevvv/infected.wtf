import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { getSession } from "./session";

export async function getCookieConsent(): Promise<string | null> {
  const session = await getSession();
  if (session) {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { cookieConsent: true } });
    if (user?.cookieConsent) return user.cookieConsent;
  }
  const store = await cookies();
  return store.get("site_cookie_consent")?.value || null;
}
