import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { parseJsonObject } from "@/lib/json-array";
import { verifyLinkToken } from "@/lib/link-token";

function xmlTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]></${tag}>`)) || xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
  return m ? m[1] : "";
}

/** Shown when the login finished inside the Steam app (no infected.wtf session there to redirect into). */
function appDonePage(ok: boolean, message: string) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Steam ${ok ? "connected" : "not connected"}</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0b10;color:#f2f2f5;font-family:system-ui,sans-serif;text-align:center;padding:24px;box-sizing:border-box}
.c{max-width:340px}.i{width:64px;height:64px;border-radius:50%;margin:0 auto 18px;display:flex;align-items:center;justify-content:center;font-size:30px;background:${ok ? "#16a34a" : "#dc2626"}}
h1{font-size:22px;margin:0 0 10px}p{color:#a1a1aa;line-height:1.5;margin:0 0 20px}a{display:inline-block;padding:12px 20px;border-radius:12px;background:#7c3aed;color:#fff;text-decoration:none;font-weight:700}</style></head>
<body><div class="c"><div class="i">${ok ? "✓" : "✕"}</div><h1>${ok ? "Steam connected" : "Couldn't connect Steam"}</h1><p>${message}</p><a href="https://infected.wtf/dashboard?page=integrations">Open infected.wtf</a></div></body></html>`;
  return new NextResponse(html, { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(req: NextRequest) {
  const siteUrl = (process.env.SITE_URL || "https://infected.wtf").replace(/\/$/, "");
  const sessionUser = await getCurrentUser();
  // Without a session we're inside the Steam app: identify the user from the signed link token instead.
  const userId = sessionUser?.id ?? verifyLinkToken(req.nextUrl.searchParams.get("lt"), "steam");
  const inApp = !sessionUser;
  const fail = (reason: string) =>
    inApp
      ? appDonePage(false, reason === "already_linked" ? "That Steam account is already linked to another infected.wtf user." : "The Steam login couldn't be verified. Please try again from your dashboard.")
      : NextResponse.redirect(`${siteUrl}/dashboard?page=integrations&error=${reason}`);
  if (!userId) return inApp ? appDonePage(false, "This link expired. Start again from Connect Steam in your dashboard.") : NextResponse.redirect(`${siteUrl}/login`);
  const user = { id: userId };

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

  if (inApp) return appDonePage(true, `Your Steam account${personaName ? ` (${personaName.replace(/[<>&"]/g, "")})` : ""} is now on your profile. You can go back to your browser.`);
  return NextResponse.redirect(`${siteUrl}/dashboard?page=integrations&connected=steam`);
}
