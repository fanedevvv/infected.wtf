import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshSpotifyNowPlaying } from "@/lib/spotify";

// Public: the current track shown on a profile's Spotify card (same data the profile page already shows).
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") || "";
  const profile = await prisma.profile.findUnique({ where: { slug }, select: { userId: true, user: { select: { banned: true } } } });
  if (!profile || profile.user.banned) return NextResponse.json({ success: false }, { status: 404 });
  const nowPlaying = await refreshSpotifyNowPlaying(profile.userId);
  if (nowPlaying === undefined) return NextResponse.json({ success: false }, { status: 404 });
  return NextResponse.json({ success: true, nowPlaying }, { headers: { "Cache-Control": "no-store" } });
}
