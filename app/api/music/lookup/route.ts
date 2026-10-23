import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";

type LrcLibResult = { syncedLyrics?: string | null; plainLyrics?: string | null };
type ItunesResult = { artworkUrl100?: string };

async function fetchJson(url: string, timeoutMs = 6000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store", headers: { "User-Agent": "infected.wtf" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const artist = String(body.artist || "").trim();
  if (!title) return NextResponse.json({ success: false, error: "Track title is required." }, { status: 400 });

  const [itunesData, lrcData] = await Promise.all([
    fetchJson(`https://itunes.apple.com/search?term=${encodeURIComponent(`${title} ${artist}`)}&entity=song&limit=1`) as Promise<{ results?: ItunesResult[] } | null>,
    fetchJson(`https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`) as Promise<LrcLibResult[] | null>,
  ]);

  const artworkRaw = itunesData?.results?.[0]?.artworkUrl100;
  const artworkUrl = artworkRaw ? artworkRaw.replace("100x100bb", "600x600bb") : null;

  const lyricsMatch = lrcData?.find((r) => r.syncedLyrics) || lrcData?.find((r) => r.plainLyrics) || null;
  const lyricsSynced = lyricsMatch?.syncedLyrics || null;
  const lyricsPlain = lyricsMatch?.plainLyrics || null;

  return NextResponse.json({
    success: true,
    artworkUrl,
    lyricsSynced,
    lyricsPlain,
    found: { artwork: !!artworkUrl, lyrics: !!(lyricsSynced || lyricsPlain), synced: !!lyricsSynced },
  });
}
