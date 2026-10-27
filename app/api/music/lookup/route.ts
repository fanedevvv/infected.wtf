import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";

type LrcLibResult = { trackName?: string; artistName?: string; syncedLyrics?: string | null; plainLyrics?: string | null };
type ItunesResult = { trackName?: string; artworkUrl100?: string };

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

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Picks the result whose title/artist most closely matches what was searched — never a loosely-related track, even if nothing scores well. */
function bestLyricsMatch(results: LrcLibResult[] | null, title: string, artist: string): LrcLibResult | null {
  if (!results?.length) return null;
  const nTitle = normalize(title);
  const nArtist = normalize(artist);
  const withLyrics = results.filter((r) => r.syncedLyrics || r.plainLyrics);
  if (withLyrics.length === 0) return null;

  function score(r: LrcLibResult): { total: number; titleScore: number } {
    const rt = normalize(r.trackName || "");
    const ra = normalize(r.artistName || "");
    let titleScore = 0;
    if (rt === nTitle) titleScore = 10;
    else if (rt.includes(nTitle) || nTitle.includes(rt)) titleScore = 5;
    let s = titleScore;
    if (nArtist) {
      if (ra === nArtist) s += 10;
      else if (ra.includes(nArtist) || nArtist.includes(ra)) s += 5;
    }
    if (r.syncedLyrics) s += 2;
    return { total: s, titleScore };
  }

  const best = withLyrics.reduce((b, r) => (score(r).total > score(b).total ? r : b), withLyrics[0]);
  // Require at least a partial title match — a result that's only "best" because nothing else scored
  // anything is a different song, not a usable match.
  return score(best).titleScore > 0 ? best : null;
}

/** Same idea for iTunes artwork: don't show cover art for an unrelated track just because it was result #1. */
function bestArtworkMatch(results: { trackName?: string; artworkUrl100?: string }[] | undefined, title: string): string | null {
  if (!results?.length) return null;
  const nTitle = normalize(title);
  let best: { trackName?: string; artworkUrl100?: string } | null = null;
  let bestScore = 0;
  for (const r of results) {
    const rt = normalize(r.trackName || "");
    let s = 0;
    if (rt === nTitle) s = 10;
    else if (rt.includes(nTitle) || nTitle.includes(rt)) s = 5;
    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  }
  return bestScore > 0 ? best?.artworkUrl100 || null : null;
}

/** lyrics.ovh has broader (but sync-free) coverage — used when lrclib has nothing for the track. */
async function fetchOvhLyrics(title: string, artist: string): Promise<string | null> {
  if (!artist) return null;
  const data = (await fetchJson(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`)) as { lyrics?: string } | null;
  return data?.lyrics?.trim() || null;
}

async function searchLrcLib(title: string, artist: string): Promise<LrcLibResult[] | null> {
  const url = artist
    ? `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`
    : `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}`;
  return (await fetchJson(url)) as LrcLibResult[] | null;
}

/** youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/... */
function isYoutubeUrl(url: string): boolean {
  return /^https:\/\/(www\.|m\.)?(youtube\.com\/(watch\?|shorts\/)|youtu\.be\/)/i.test(url);
}

async function resolveYoutubeTitle(url: string): Promise<{ title: string; artist: string } | null> {
  const data = (await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)) as
    | { title?: string; author_name?: string }
    | null;
  if (!data?.title) return null;

  // Strip bracketed/parenthetical fluff ("(Official Video)", "[Lyrics]", "(Official Music Video)" …).
  let clean = data.title.replace(/[([][^)\]]*[)\]]/g, " ").trim();
  // Strip "ft./feat. X" — it hurts exact-title matching on lyrics providers.
  clean = clean.replace(/\s+(ft\.|feat\.?|featuring)\s+.+$/i, "").trim();
  // Strip straight/smart quotes some channels wrap the title in — they corrupt iTunes' quoted-phrase search.
  clean = clean.replace(/["'“”‘’]/g, "").replace(/\s+/g, " ").trim();

  const parts = clean.split(/\s[-–—]\s/);
  let title = clean;
  let artist = (data.author_name || "").replace(/VEVO$/i, "").replace(/\bofficial\b/gi, "").replace(/\bmusic\b/gi, "").trim();

  if (parts.length >= 2) {
    artist = parts[0].trim();
    title = parts.slice(1).join(" - ").trim();
  }

  return { title: title || clean, artist };
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const youtubeUrl = String(body.youtubeUrl || "").trim();
  let title = String(body.title || "").trim();
  let artist = String(body.artist || "").trim();
  let resolvedFromYoutube: { title: string; artist: string } | null = null;

  if (youtubeUrl) {
    if (!isYoutubeUrl(youtubeUrl)) {
      return NextResponse.json({ success: false, error: "Paste a valid YouTube video link." }, { status: 400 });
    }
    resolvedFromYoutube = await resolveYoutubeTitle(youtubeUrl);
    if (!resolvedFromYoutube) {
      return NextResponse.json({ success: false, error: "Couldn't read that YouTube video's title." }, { status: 400 });
    }
    title = resolvedFromYoutube.title;
    artist = resolvedFromYoutube.artist;
  }

  if (!title) return NextResponse.json({ success: false, error: "Track title is required." }, { status: 400 });

  const [itunesData, lrcData] = await Promise.all([
    fetchJson(`https://itunes.apple.com/search?term=${encodeURIComponent(`${title} ${artist}`)}&entity=song&limit=5`) as Promise<{ results?: ItunesResult[] } | null>,
    searchLrcLib(title, artist),
  ]);

  const artworkRaw = bestArtworkMatch(itunesData?.results, title);
  const artworkUrl = artworkRaw ? artworkRaw.replace("100x100bb", "600x600bb") : null;

  // Deliberately no "search by title only" fallback here: dropping the artist to find *a* match
  // with the right title is exactly how this returned a different artist's song before.
  const lyricsMatch = bestLyricsMatch(lrcData, title, artist);

  const lyricsSynced = lyricsMatch?.syncedLyrics || null;
  let lyricsPlain = lyricsMatch?.plainLyrics || null;

  if (!lyricsSynced && !lyricsPlain) {
    lyricsPlain = await fetchOvhLyrics(title, artist);
  }

  return NextResponse.json({
    success: true,
    resolvedTitle: resolvedFromYoutube ? title : null,
    resolvedArtist: resolvedFromYoutube ? artist : null,
    artworkUrl,
    lyricsSynced,
    lyricsPlain,
    found: { artwork: !!artworkUrl, lyrics: !!(lyricsSynced || lyricsPlain), synced: !!lyricsSynced },
  });
}
