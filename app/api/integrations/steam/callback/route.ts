import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { parseJsonObject } from "@/lib/json-array";

function xmlTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]></${tag}>`)) || xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
  return m ? m[1] : "";
}

export async function GET(req: NextRequest) {
  const siteUrl = (process.env.SITE_URL || "https://infected.wtf").replace(/\/$/, "");
  const fail = (reason: string) => NextResponse.redirect(`${siteUrl}/dashboard?page=integrations&error=${reason}`);

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${siteUrl}/login`);

  const url = req.nextUrl;
  const claimedId = url.searchParams.get("openid.claimed_id") || "";
  const idMatch = claimedId.match(/\/openid\/id\/(\d+)$/);
  if (!idMatch) return fail("steam_failed");
  const steamId64 = idMatch[1];

  const verifyParams = new URLSearchParams();
  url.searchParams.forEach((value, key) => verifyParams.set(key, value));
  verifyParams.set("openid.mode", "check_authentication");

  let verifyOk = false;
  try {
    const verifyRes = await fetch("https://steamcommunity.com/openid/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verifyParams.toString(),
    });
    const verifyText = await verifyRes.text();
    verifyOk = /is_valid\s*:\s*true/.test(verifyText);
  } catch {
    verifyOk = false;
  }
  if (!verifyOk) return fail("steam_failed");

  let personaName = "";
  let avatarUrl = "";
  try {
    const profRes = await fetch(`https://steamcommunity.com/profiles/${steamId64}/?xml=1`, { cache: "no-store" });
    const xml = await profRes.text();
    personaName = xmlTag(xml, "steamID") || steamId64;
    avatarUrl = xmlTag(xml, "avatarFull") || xmlTag(xml, "avatarMedium") || "";
  } catch {
    personaName = steamId64;
  }

  const steamRows = await prisma.integration.findMany({ where: { type: "steam" } });
  const existing = steamRows.find((row) => parseJsonObject<{ steamId64?: string }>(row.data)?.steamId64 === steamId64);
  if (existing && existing.userId !== user.id) return fail("already_linked");

  const steamData = JSON.stringify({ steamId64, personaName, avatarUrl, profileUrl: `https://steamcommunity.com/profiles/${steamId64}` });
  await prisma.integration.upsert({
    where: { userId_type: { userId: user.id, type: "steam" } },
    create: { userId: user.id, type: "steam", visible: true, data: steamData },
    update: { visible: true, data: steamData },
  });

  return NextResponse.redirect(`${siteUrl}/dashboard?page=integrations&connected=steam`);
}
