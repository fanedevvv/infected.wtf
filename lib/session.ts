import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "session";

export interface SessionPayload {
  userId: number;
}

export async function createSession(userId: number) {
  const token = jwt.sign({ userId } as SessionPayload, JWT_SECRET, { expiresIn: "30d" });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

const PENDING_COOKIE = "pending_2fa";

export function createPendingTwoFaToken(userId: number): string {
  return jwt.sign({ userId, pending2fa: true }, JWT_SECRET, { expiresIn: "10m" });
}

export async function setPendingTwoFaCookie(token: string) {
  const store = await cookies();
  store.set(PENDING_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
}

export async function getPendingTwoFaUserId(): Promise<number | null> {
  const store = await cookies();
  const token = store.get(PENDING_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; pending2fa: boolean };
    return payload.pending2fa ? payload.userId : null;
  } catch {
    return null;
  }
}

export async function clearPendingTwoFaCookie() {
  const store = await cookies();
  store.delete(PENDING_COOKIE);
}
