import crypto from "node:crypto";

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_QUOTA_FREE = 250 * 1024 * 1024;
export const IMAGE_QUOTA_PLUS = 2 * 1024 * 1024 * 1024;
export const IMAGE_EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
export const IMAGE_SITE = (process.env.SITE_URL || "https://infected.wtf").replace(/\/$/, "");

const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Short, unambiguous share key (no 0/O/1/l/I). */
export function newImageKey(length = 8) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function imageQuota(user: { isPremium: boolean | null; premiumExpiresAt: Date | null }) {
  const plus = !!user.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());
  return plus ? IMAGE_QUOTA_PLUS : IMAGE_QUOTA_FREE;
}

export function imageLinks(img: { key: string; path: string }) {
  return { page: `${IMAGE_SITE}/i/${img.key}`, direct: `${IMAGE_SITE}/${img.path}` };
}
