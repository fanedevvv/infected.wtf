import crypto from "node:crypto";
import { prisma } from "./prisma";
import { parseJsonObject } from "./json-array";

export type SteamProfile = { steamId64: string; personaName: string; avatarUrl: string; summary: string; isPublic: boolean };

function xmlTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`)) || xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? m[1] : "";
}

/** Public profile via steamcommunity's XML view (no API key). `ref` is a SteamID64 or a vanity name. */
export async function fetchSteamProfile(ref: { steamId64?: string; vanity?: string }): Promise<SteamProfile | null> {
  const path = ref.steamId64 ? `profiles/${ref.steamId64}` : `id/${encodeURIComponent(ref.vanity || "")}`;
  try {
    // The cache-buster matters: Steam caches the XML view, and we re-read it right after the user edits their summary.
    const res = await fetch(`https://steamcommunity.com/${path}/?xml=1&_=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const xml = await res.text();
    const steamId64 = xmlTag(xml, "steamID64");
    if (!/^\d{17}$/.test(steamId64)) return null;
    return {
      steamId64,
      personaName: xmlTag(xml, "steamID") || steamId64,
      avatarUrl: xmlTag(xml, "avatarFull") || xmlTag(xml, "avatarMedium") || "",
      summary: xmlTag(xml, "summary"),
      isPublic: xmlTag(xml, "privacyState") === "public",
    };
  } catch {
    return null;
  }
}

/** Accepts a profile link (/id/name or /profiles/7656…), a bare SteamID64 or a bare vanity name. */
export function parseSteamRef(input: string): { steamId64?: string; vanity?: string } | null {
  const v = input.trim();
  if (/^\d{17}$/.test(v)) return { steamId64: v };
  const m = v.match(/steamcommunity\.com\/(id|profiles)\/([^/?#]+)/i);
  if (m) return m[1].toLowerCase() === "profiles" ? (/^\d{17}$/.test(m[2]) ? { steamId64: m[2] } : null) : { vanity: m[2] };
  if (/^[A-Za-z0-9_-]{2,32}$/.test(v)) return { vanity: v };
  return null;
}

/** Code the user puts in their Steam profile summary to prove ownership; stable per (user, Steam account). */
export function steamVerifyCode(userId: number, steamId64: string): string {
  const digest = crypto.createHmac("sha256", `${process.env.JWT_SECRET}:steam-verify`).update(`${userId}:${steamId64}`).digest();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return `INF-${Array.from(digest.subarray(0, 6), (b) => alphabet[b % alphabet.length]).join("")}`;
}

/** Saves the Steam integration; refuses a Steam account that's already linked to someone else. */
export async function linkSteam(userId: number, p: { steamId64: string; personaName: string; avatarUrl: string }): Promise<"ok" | "already_linked"> {
  const rows = await prisma.integration.findMany({ where: { type: "steam" } });
  const existing = rows.find((row) => parseJsonObject<{ steamId64?: string }>(row.data)?.steamId64 === p.steamId64);
  if (existing && existing.userId !== userId) return "already_linked";
  const data = JSON.stringify({ steamId64: p.steamId64, personaName: p.personaName, avatarUrl: p.avatarUrl, profileUrl: `https://steamcommunity.com/profiles/${p.steamId64}` });
  await prisma.integration.upsert({
    where: { userId_type: { userId, type: "steam" } },
    create: { userId, type: "steam", visible: true, data },
    update: { visible: true, data },
  });
  return "ok";
}
