import crypto from "crypto";

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY!;
const BLIND_INDEX_KEY = process.env.EMAIL_BLIND_INDEX_KEY!;

/** AES-256-CBC encrypt, IV prepended, base64 output — mirrors PHP encryptEmail() */
export function encryptEmail(email: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(email.trim().toLowerCase(), "utf8"), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString("base64");
}

/** Decrypt a value produced by encryptEmail(); returns the input unchanged if it isn't valid ciphertext. */
export function decryptEmail(encrypted: string): string {
  if (!encrypted) return "";
  try {
    const data = Buffer.from(encrypted, "base64");
    if (data.length < 17) return encrypted;
    const iv = data.subarray(0, 16);
    const cipherText = data.subarray(16);
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return encrypted;
  }
}

/** Deterministic HMAC-SHA256 of the email — used for DB lookup/uniqueness instead of the ciphertext. */
export function emailBlindIndex(email: string): string {
  return crypto.createHmac("sha256", BLIND_INDEX_KEY).update(email.trim().toLowerCase()).digest("hex");
}

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}
