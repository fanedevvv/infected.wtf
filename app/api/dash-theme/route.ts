import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { DASH_ACCENT_COOKIE, DASH_THEME_COOKIE, normalizeAccent, normalizeDashMode } from "@/lib/dash-theme";

// Saves the dashboard look on the account (so it follows you across browsers) and as server-set cookies,
// which survive browsers that drop or shadow cookies written from JavaScript.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const mode = normalizeDashMode(body.mode);
  const accent = normalizeAccent(body.accent);

  const session = await getSession();
  if (session) {
    await prisma.user.update({ where: { id: session.userId }, data: { dashTheme: mode, dashAccent: accent } }).catch(() => {});
  }

  const res = NextResponse.json({ success: true });
  const host = (req.headers.get("host") || "").split(":")[0];
  const age = 60 * 60 * 24 * 365;
  for (const [name, value] of [[DASH_THEME_COOKIE, mode], [DASH_ACCENT_COOKIE, encodeURIComponent(accent)]]) {
    // Expire stray copies (parent-domain or /dashboard-scoped) that would otherwise be sent first and win.
    res.headers.append("Set-Cookie", `${name}=; Path=/dashboard; Max-Age=0`);
    if (host.includes(".")) res.headers.append("Set-Cookie", `${name}=; Path=/; Domain=.${host.replace(/^www\./, "")}; Max-Age=0`);
    res.headers.append("Set-Cookie", `${name}=${value}; Path=/; Max-Age=${age}; SameSite=Lax`);
  }
  return res;
}
