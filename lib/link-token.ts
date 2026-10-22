import crypto from "node:crypto";

// Short-lived signed token naming the user who started an account-link flow, for callbacks that land in a
// browser without our session cookie (e.g. Steam login confirmed inside the Steam app on a phone).

const TTL_MS = 10 * 60 * 1000;

function sign(payload: string) {
  return crypto.createHmac("sha256", `${process.env.JWT_SECRET}:link-token`).update(payload).digest("base64url");
}

export function createLinkToken(userId: number, purpose: string): string {
  const payload = `${purpose}.${userId}.${Date.now() + TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyLinkToken(token: string | null, purpose: string): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [p, uid, exp, sig] = parts;
  const expected = sign(`${p}.${uid}.${exp}`);
  if (p !== purpose || sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Date.now() > Number(exp)) return null;
  const id = Number(uid);
  return Number.isInteger(id) && id > 0 ? id : null;
}
